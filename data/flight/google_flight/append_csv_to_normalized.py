from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from copy import deepcopy
from datetime import datetime
from pathlib import Path


BASE_DIR = Path(__file__).parent
DEFAULT_NORMALIZED_PATH = BASE_DIR.parent / "normalized" / "google_flight.jsonl"
DEFAULT_MAPPING_PATH = BASE_DIR.parent / "trip_com" / "city_airport_mapping.json"
DEFAULT_CSV_GLOB = "explore_prices_live_2026*.csv"
MANUAL_HOTEL_OVERRIDES = {
    ("KOROR", "2026-07"): 182735,
    ("KOROR", "2026-08"): 249703,
}


def parse_price_krw(text: str | None) -> int | None:
    if not text or text == "N/A":
        return None

    cleaned = re.sub(r"[^\d]", "", text)
    return int(cleaned) if cleaned else None


def parse_duration_minutes(text: str | None) -> int | None:
    if not text or text == "N/A":
        return None

    hours_match = re.search(r"(\d+)\s*시간", text)
    minutes_match = re.search(r"(\d+)\s*분", text)
    hours = int(hours_match.group(1)) if hours_match else 0
    minutes = int(minutes_match.group(1)) if minutes_match else 0
    total = hours * 60 + minutes
    return total if total > 0 else None


def minutes_to_text(minutes: int) -> str:
    hours = minutes // 60
    remain = minutes % 60
    return f"{hours}시간 {remain}분" if hours else f"{remain}분"


def stops_text_to_count(text: str | None) -> int:
    if not text or text == "N/A":
        return -1
    if "직항" in text:
        return 0
    match = re.search(r"(\d+)", text)
    return int(match.group(1)) if match else -1


def compute_typical_stops(stops_texts: list[str]) -> tuple[int, str]:
    valid = [value for value in stops_texts if value and value != "N/A"]
    if not valid:
        return -1, "N/A"

    counts = [stops_text_to_count(value) for value in valid]
    most_common = Counter(counts).most_common(1)[0][0]
    if most_common == 0:
        return 0, "직항"
    if most_common > 0:
        return most_common, f"경유 {most_common}회"
    return -1, "N/A"


def compute_avg_duration(duration_texts: list[str]) -> tuple[int, str]:
    minutes = [parse_duration_minutes(value) for value in duration_texts if value and value != "N/A"]
    minutes = [value for value in minutes if value is not None]
    if not minutes:
        return 0, "N/A"

    average = round(sum(minutes) / len(minutes))
    return average, minutes_to_text(average)


def normalize_optional_text(value: str | None) -> str:
    if value is None:
        return "N/A"
    cleaned = value.strip()
    return cleaned or "N/A"


def build_city_lookups(mapping_path: Path) -> tuple[dict[str, dict], dict[str, dict]]:
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    by_kr_name: dict[str, dict] = {}
    by_airport: dict[str, dict] = {}

    for item in mapping:
        city_name_kr = item["city_name_kr"].strip()
        by_kr_name[city_name_kr] = {
            "city_code": item["city_code"],
            "city_name_kr": city_name_kr,
        }

        for route in item.get("routes", []):
            airport = route.get("airport", "").strip().upper()
            if airport and airport not in by_airport:
                by_airport[airport] = {
                    "city_code": item["city_code"],
                    "city_name_kr": city_name_kr,
                }

    return by_kr_name, by_airport


def resolve_city(row: dict[str, str], city_lookup: dict[str, dict], airport_lookup: dict[str, dict] | None = None) -> dict:
    searched_as = row.get("Searched As", "").strip()
    if searched_as in city_lookup:
        return city_lookup[searched_as]

    if airport_lookup is not None:
        destination = row.get("Destination", "").strip().upper()
        if destination in airport_lookup:
            return airport_lookup[destination]

    raise KeyError(f"City lookup failed for CSV row: searched_as={searched_as!r}, destination={row.get('Destination')!r}")


def month_to_year_month(month_text: str, timestamp_text: str) -> tuple[str, str]:
    month_match = re.search(r"(\d+)", month_text or "")
    if month_match is None:
        raise ValueError(f"Invalid month text: {month_text!r}")

    timestamp = datetime.strptime(timestamp_text, "%Y-%m-%d %H:%M:%S")
    month_number = int(month_match.group(1))
    year_month = f"{timestamp.year:04d}-{month_number:02d}"
    return year_month, f"{year_month}-01"


def convert_csv_row_to_record(
    row: dict[str, str],
    city_lookup: dict[str, dict],
    airport_lookup: dict[str, dict] | None = None,
) -> dict:
    city = resolve_city(row, city_lookup, airport_lookup)
    collected_at = row["Timestamp"].strip()
    year_month, event_time = month_to_year_month(row["Month"], collected_at)

    stops_texts = [
        normalize_optional_text(row.get("Flight 1 Stops")),
        normalize_optional_text(row.get("Flight 2 Stops")),
        normalize_optional_text(row.get("Flight 3 Stops")),
    ]
    duration_texts = [
        normalize_optional_text(row.get("Flight 1 Duration")),
        normalize_optional_text(row.get("Flight 2 Duration")),
        normalize_optional_text(row.get("Flight 3 Duration")),
    ]

    typical_stops_count, typical_stops_text = compute_typical_stops(stops_texts)
    avg_duration_minutes, avg_duration_text = compute_avg_duration(duration_texts)

    return {
        "dataset": "airticket",
        "schema_version": 3,
        "source": "google_flights",
        "ingest_time": collected_at.replace(" ", "T"),
        "event_time": event_time,
        "entity": {
            "city_id": city["city_code"],
            "city_name_kr": city["city_name_kr"],
            "origin_airport": "ICN",
            "target_month": normalize_optional_text(row.get("Month")),
            "year_month": year_month,
            "route_type": "explore_monthly_snapshot",
        },
        "payload": {
            "trip_length_days": 7,
            "trip_dates": normalize_optional_text(row.get("Dates")),
            "hotel_price": parse_price_krw(row.get("Hotel Price / Night")),
            "flight_1_stops_text": stops_texts[0],
            "flight_1_duration_text": duration_texts[0],
            "flight_2_stops_text": stops_texts[1],
            "flight_2_duration_text": duration_texts[1],
            "flight_3_stops_text": stops_texts[2],
            "flight_3_duration_text": duration_texts[2],
            "typical_stops_count": typical_stops_count,
            "typical_stops_text": typical_stops_text,
            "avg_duration_minutes": avg_duration_minutes,
            "avg_duration_text": avg_duration_text,
            "peak_season_months_raw": normalize_optional_text(row.get("Peak Season Months (Raw)")),
            "peak_season_months_list": normalize_optional_text(row.get("Peak Season Months (List)")),
            "off_season_months_raw": normalize_optional_text(row.get("Off Season Months (Raw)")),
            "off_season_months_list": normalize_optional_text(row.get("Off Season Months (List)")),
            "collected_at": collected_at,
        },
    }


def parse_collected_at(record: dict) -> datetime:
    return datetime.strptime(record["payload"]["collected_at"], "%Y-%m-%d %H:%M:%S")


def repair_records(records: list[dict]) -> list[dict]:
    repaired = deepcopy(records)
    by_city_month: dict[tuple[str, str], list[dict]] = defaultdict(list)
    by_city: dict[str, list[dict]] = defaultdict(list)

    for record in repaired:
        city_id = record["entity"]["city_id"]
        year_month = record["entity"]["year_month"]
        by_city_month[(city_id, year_month)].append(record)
        by_city[city_id].append(record)

    city_season_defaults: dict[str, dict[str, str]] = {}
    for city_id, city_records in by_city.items():
        season_candidates = [
            (
                payload["peak_season_months_raw"],
                payload["peak_season_months_list"],
                payload["off_season_months_raw"],
                payload["off_season_months_list"],
            )
            for payload in (record["payload"] for record in city_records)
            if payload.get("peak_season_months_list") not in (None, "", "N/A")
            and payload.get("off_season_months_list") not in (None, "", "N/A")
        ]
        if season_candidates:
            top = Counter(season_candidates).most_common(1)[0][0]
            city_season_defaults[city_id] = {
                "peak_season_months_raw": top[0],
                "peak_season_months_list": top[1],
                "off_season_months_raw": top[2],
                "off_season_months_list": top[3],
            }

    for record in repaired:
        payload = record["payload"]
        city_id = record["entity"]["city_id"]
        year_month = record["entity"]["year_month"]

        manual_hotel_price = MANUAL_HOTEL_OVERRIDES.get((city_id, year_month))
        if manual_hotel_price is not None and payload.get("hotel_price") is None:
            payload["hotel_price"] = manual_hotel_price

        if payload.get("hotel_price") is None:
            current_time = parse_collected_at(record)
            candidates = [
                candidate
                for candidate in by_city_month[(city_id, year_month)]
                if candidate["payload"].get("hotel_price") is not None
            ]
            if candidates:
                nearest = min(
                    candidates,
                    key=lambda candidate: abs(parse_collected_at(candidate) - current_time),
                )
                payload["hotel_price"] = nearest["payload"]["hotel_price"]

        season_defaults = city_season_defaults.get(city_id)
        if season_defaults is not None:
            if payload.get("peak_season_months_raw") in (None, "", "N/A"):
                payload["peak_season_months_raw"] = season_defaults["peak_season_months_raw"]
            if payload.get("peak_season_months_list") in (None, "", "N/A"):
                payload["peak_season_months_list"] = season_defaults["peak_season_months_list"]
            if payload.get("off_season_months_raw") in (None, "", "N/A"):
                payload["off_season_months_raw"] = season_defaults["off_season_months_raw"]
            if payload.get("off_season_months_list") in (None, "", "N/A"):
                payload["off_season_months_list"] = season_defaults["off_season_months_list"]

        if payload.get("peak_season_months_raw") in (None, "", "N/A"):
            payload["peak_season_months_raw"] = "0"
        if payload.get("peak_season_months_list") in (None, "", "N/A"):
            payload["peak_season_months_list"] = "0"
        if payload.get("off_season_months_raw") in (None, "", "N/A"):
            payload["off_season_months_raw"] = "0"
        if payload.get("off_season_months_list") in (None, "", "N/A"):
            payload["off_season_months_list"] = "0"

    return repaired


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def write_jsonl(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def append_csv_snapshots(
    normalized_path: Path = DEFAULT_NORMALIZED_PATH,
    mapping_path: Path = DEFAULT_MAPPING_PATH,
    csv_paths: list[Path] | None = None,
) -> dict[str, int]:
    city_lookup, airport_lookup = build_city_lookups(mapping_path)
    existing_records = load_jsonl(normalized_path)
    existing_keys = {
        (
            record["entity"]["city_id"],
            record["entity"]["year_month"],
            record["payload"]["collected_at"],
        )
        for record in existing_records
    }

    if csv_paths is None:
        csv_paths = sorted(BASE_DIR.glob(DEFAULT_CSV_GLOB))

    appended_records: list[dict] = []
    skipped_duplicates = 0

    for csv_path in csv_paths:
        with csv_path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                record = convert_csv_row_to_record(row, city_lookup, airport_lookup)
                key = (
                    record["entity"]["city_id"],
                    record["entity"]["year_month"],
                    record["payload"]["collected_at"],
                )
                if key in existing_keys:
                    skipped_duplicates += 1
                    continue

                existing_keys.add(key)
                appended_records.append(record)

    combined = repair_records(existing_records + appended_records)
    write_jsonl(normalized_path, combined)

    return {
        "existing_records": len(existing_records),
        "appended_records": len(appended_records),
        "skipped_duplicates": skipped_duplicates,
        "total_records": len(combined),
    }


if __name__ == "__main__":
    stats = append_csv_snapshots()
    print(json.dumps(stats, ensure_ascii=False, indent=2))
