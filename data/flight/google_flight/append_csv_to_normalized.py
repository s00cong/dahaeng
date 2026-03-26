from __future__ import annotations

import argparse
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
DEFAULT_BRONZE_ROOT = BASE_DIR / "bronze_airticket" / "google_flights"
DEFAULT_CSV_GLOB = "explore_prices_live_2026*.csv"
DIRECT_TEXT = "\uc9c1\ud56d"
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

    hours_match = re.search(r"(\d+)\s*\uc2dc\uac04", text)
    minutes_match = re.search(r"(\d+)\s*\ubd84", text)
    hours = int(hours_match.group(1)) if hours_match else 0
    minutes = int(minutes_match.group(1)) if minutes_match else 0
    total = hours * 60 + minutes
    return total if total > 0 else None


def minutes_to_text(minutes: int) -> str:
    hours = minutes // 60
    remain = minutes % 60
    if hours:
        return f"{hours}\uc2dc\uac04 {remain}\ubd84"
    return f"{remain}\ubd84"


def stops_text_to_count(text: str | None) -> int:
    if not text or text == "N/A":
        return -1
    if DIRECT_TEXT in text:
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
        return 0, DIRECT_TEXT
    if most_common > 0:
        return most_common, f"\uacbd\uc720 {most_common}\ud68c"
    return -1, "N/A"


def compute_min_duration(duration_texts: list[str]) -> tuple[int, str, bool]:
    minutes = [parse_duration_minutes(value) for value in duration_texts if value and value != "N/A"]
    minutes = [value for value in minutes if value is not None]
    if not minutes:
        return 0, "0\ubd84", True

    minimum = min(minutes)
    return minimum, minutes_to_text(minimum), False


def select_flight_by_min_duration(flights: list[dict[str, str]]) -> dict[str, int | str]:
    candidates = []
    for index, flight in enumerate(flights):
        duration_text = flight.get("duration_text")
        duration_minutes = parse_duration_minutes(duration_text)
        if duration_minutes is None:
            continue

        stops_text = flight.get("stops_text") or "N/A"
        candidates.append(
            {
                "index": index,
                "duration_minutes": duration_minutes,
                "duration_text": duration_text,
                "stops_count": stops_text_to_count(stops_text),
                "stops_text": stops_text,
            }
        )

    if not candidates:
        return {
            "duration_minutes": 0,
            "duration_text": "0\ubd84",
            "stops_count": -1,
            "stops_text": "N/A",
        }

    return min(candidates, key=lambda candidate: (candidate["duration_minutes"], candidate["index"]))


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


def resolve_city(
    row: dict[str, str],
    city_lookup: dict[str, dict],
    airport_lookup: dict[str, dict] | None = None,
) -> dict:
    searched_as = row.get("Searched As", "").strip()
    if searched_as in city_lookup:
        return city_lookup[searched_as]

    if airport_lookup is not None:
        destination = row.get("Destination", "").strip().upper()
        if destination in airport_lookup:
            return airport_lookup[destination]

    raise KeyError(
        f"City lookup failed for CSV row: searched_as={searched_as!r}, destination={row.get('Destination')!r}"
    )


def month_to_year_month(month_text: str, timestamp_text: str) -> tuple[str, str]:
    month_match = re.search(r"(\d+)", month_text or "")
    if month_match is None:
        raise ValueError(f"Invalid month text: {month_text!r}")

    timestamp = datetime.strptime(timestamp_text, "%Y-%m-%d %H:%M:%S")
    month_number = int(month_match.group(1))
    year_month = f"{timestamp.year:04d}-{month_number:02d}"
    return year_month, f"{year_month}-01"


def build_missing_duration_alert(city_code: str, year_month: str) -> dict[str, str]:
    return {
        "city_code": city_code,
        "year_month": year_month,
        "metric": "min_duration_minutes",
    }


def apply_min_duration_fields(record: dict) -> tuple[dict, list[dict]]:
    normalized = deepcopy(record)
    payload = normalized["payload"]
    entity = normalized["entity"]

    stops_texts = [
        normalize_optional_text(payload.get("flight_1_stops_text")),
        normalize_optional_text(payload.get("flight_2_stops_text")),
        normalize_optional_text(payload.get("flight_3_stops_text")),
    ]
    duration_texts = [
        normalize_optional_text(payload.get("flight_1_duration_text")),
        normalize_optional_text(payload.get("flight_2_duration_text")),
        normalize_optional_text(payload.get("flight_3_duration_text")),
    ]

    selected_flight = select_flight_by_min_duration(
        [
            {"duration_text": duration_texts[0], "stops_text": stops_texts[0]},
            {"duration_text": duration_texts[1], "stops_text": stops_texts[1]},
            {"duration_text": duration_texts[2], "stops_text": stops_texts[2]},
        ]
    )
    min_duration_minutes, min_duration_text, duration_missing = compute_min_duration(duration_texts)

    payload["flight_1_stops_text"] = stops_texts[0]
    payload["flight_1_duration_text"] = duration_texts[0]
    payload["flight_2_stops_text"] = stops_texts[1]
    payload["flight_2_duration_text"] = duration_texts[1]
    payload["flight_3_stops_text"] = stops_texts[2]
    payload["flight_3_duration_text"] = duration_texts[2]
    payload["typical_stops_count"] = int(selected_flight["stops_count"])
    payload["typical_stops_text"] = str(selected_flight["stops_text"])
    payload["min_duration_minutes"] = min_duration_minutes
    payload["min_duration_text"] = min_duration_text
    payload.pop("avg_duration_minutes", None)
    payload.pop("avg_duration_text", None)

    if duration_missing:
        return normalized, [build_missing_duration_alert(entity["city_id"], entity["year_month"])]
    return normalized, []


def convert_csv_row_to_record(
    row: dict[str, str],
    city_lookup: dict[str, dict],
    airport_lookup: dict[str, dict] | None = None,
) -> tuple[dict, list[dict]]:
    city = resolve_city(row, city_lookup, airport_lookup)
    collected_at = row["Timestamp"].strip()
    year_month, event_time = month_to_year_month(row["Month"], collected_at)

    record = {
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
            "flight_1_stops_text": row.get("Flight 1 Stops"),
            "flight_1_duration_text": row.get("Flight 1 Duration"),
            "flight_2_stops_text": row.get("Flight 2 Stops"),
            "flight_2_duration_text": row.get("Flight 2 Duration"),
            "flight_3_stops_text": row.get("Flight 3 Stops"),
            "flight_3_duration_text": row.get("Flight 3 Duration"),
            "peak_season_months_raw": normalize_optional_text(row.get("Peak Season Months (Raw)")),
            "peak_season_months_list": normalize_optional_text(row.get("Peak Season Months (List)")),
            "off_season_months_raw": normalize_optional_text(row.get("Off Season Months (Raw)")),
            "off_season_months_list": normalize_optional_text(row.get("Off Season Months (List)")),
            "collected_at": collected_at,
        },
    }
    return apply_min_duration_fields(record)


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


def record_key(record: dict) -> tuple[str, str, str]:
    return (
        record["entity"]["city_id"],
        record["entity"]["year_month"],
        record["payload"]["collected_at"],
    )


def iter_bronze_jsonl(bronze_root: Path):
    for path in sorted(bronze_root.rglob("*.jsonl")):
        yield from load_jsonl(path)


def append_csv_snapshots(
    normalized_path: Path = DEFAULT_NORMALIZED_PATH,
    mapping_path: Path = DEFAULT_MAPPING_PATH,
    csv_paths: list[Path] | None = None,
) -> dict[str, int | list[dict]]:
    city_lookup, airport_lookup = build_city_lookups(mapping_path)
    existing_records = load_jsonl(normalized_path)
    existing_keys = {record_key(record) for record in existing_records}

    if csv_paths is None:
        csv_paths = sorted(BASE_DIR.glob(DEFAULT_CSV_GLOB))

    appended_records: list[dict] = []
    missing_duration_alerts: list[dict] = []
    skipped_duplicates = 0

    for csv_path in csv_paths:
        with csv_path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                record, row_missing_duration_alerts = convert_csv_row_to_record(
                    row,
                    city_lookup,
                    airport_lookup,
                )
                key = record_key(record)
                if key in existing_keys:
                    skipped_duplicates += 1
                    continue

                existing_keys.add(key)
                appended_records.append(record)
                missing_duration_alerts.extend(row_missing_duration_alerts)

    combined = repair_records(existing_records + appended_records)
    write_jsonl(normalized_path, combined)

    return {
        "existing_records": len(existing_records),
        "appended_records": len(appended_records),
        "skipped_duplicates": skipped_duplicates,
        "total_records": len(combined),
        "missing_duration_alerts": missing_duration_alerts,
    }


def rebuild_normalized_from_bronze(
    normalized_path: Path = DEFAULT_NORMALIZED_PATH,
    bronze_root: Path = DEFAULT_BRONZE_ROOT,
) -> dict[str, int | list[dict]]:
    seen_keys: set[tuple[str, str, str]] = set()
    rebuilt_records: list[dict] = []
    missing_duration_alerts: list[dict] = []
    bronze_records = 0
    skipped_duplicates = 0

    for record in iter_bronze_jsonl(bronze_root):
        bronze_records += 1
        rebuilt_record, record_missing_duration_alerts = apply_min_duration_fields(record)
        key = record_key(rebuilt_record)
        if key in seen_keys:
            skipped_duplicates += 1
            continue

        seen_keys.add(key)
        rebuilt_records.append(rebuilt_record)
        missing_duration_alerts.extend(record_missing_duration_alerts)

    repaired = repair_records(rebuilt_records)
    write_jsonl(normalized_path, repaired)

    return {
        "bronze_records": bronze_records,
        "rebuilt_records": len(repaired),
        "skipped_duplicates": skipped_duplicates,
        "missing_duration_alerts": missing_duration_alerts,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize Google Flight snapshots")
    parser.add_argument("--normalized-path", default=str(DEFAULT_NORMALIZED_PATH))
    parser.add_argument("--mapping-path", default=str(DEFAULT_MAPPING_PATH))
    parser.add_argument("--bronze-root", default=str(DEFAULT_BRONZE_ROOT))
    parser.add_argument(
        "--rebuild-from-bronze",
        action="store_true",
        help="Ignore CSV input and rebuild the normalized JSONL from bronze JSONL files.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    normalized_path = Path(args.normalized_path)

    if args.rebuild_from_bronze:
        stats = rebuild_normalized_from_bronze(
            normalized_path=normalized_path,
            bronze_root=Path(args.bronze_root),
        )
    else:
        stats = append_csv_snapshots(
            normalized_path=normalized_path,
            mapping_path=Path(args.mapping_path),
        )

    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
