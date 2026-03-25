from __future__ import annotations

import argparse
import json
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from city_id_mapping import parse_mysql_connection_info
from flight_summary_fallback import fill_missing_summary_metrics


BASE_DIR = Path(__file__).resolve().parent
FLIGHT_ROOT = BASE_DIR.parent
DEFAULT_GOOGLE_PATH = FLIGHT_ROOT / "normalized" / "google_flight.jsonl"
DEFAULT_TRIP_PATH = FLIGHT_ROOT / "normalized" / "trip_com.jsonl"
DEFAULT_MAPPING_PATH = FLIGHT_ROOT / "trip_com" / "city_airport_mapping.json"


def parse_args():
    parser = argparse.ArgumentParser(description="Local flight_summary ETL from normalized JSONL")
    parser.add_argument("--google-path", default=str(DEFAULT_GOOGLE_PATH))
    parser.add_argument("--trip-path", default=str(DEFAULT_TRIP_PATH))
    parser.add_argument("--mapping-path", default=str(DEFAULT_MAPPING_PATH))
    parser.add_argument("--db-url", default=os.getenv("DB_URL"))
    parser.add_argument("--db-host", default="localhost")
    parser.add_argument("--db-port", type=int, default=3307)
    parser.add_argument("--db-name", default="dahang")
    parser.add_argument("--db-user", default="root")
    parser.add_argument("--db-password", default="ssafy")
    return parser.parse_args()


def resolve_db_connection_settings(args) -> dict[str, int | str]:
    if getattr(args, "db_url", None):
        return parse_mysql_connection_info(args.db_url)

    return {
        "host": args.db_host,
        "port": args.db_port,
        "database": args.db_name,
    }


def load_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def load_code_to_city_name(mapping_path: Path) -> dict[str, str]:
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    return {
        item["city_code"].strip().upper(): item["city_name_en"].strip()
        for item in mapping
        if item.get("city_code") and item.get("city_name_en")
    }


def load_mapping_indexes(mapping_path: Path) -> dict[str, dict]:
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    code_to_city_name = {}
    canonical_codes: set[str] = set()
    city_name_to_code = {}
    airport_to_code = {}

    for item in mapping:
        code = (item.get("city_code") or "").strip().upper()
        city_name = (item.get("city_name_en") or "").strip()
        if not code or not city_name:
            continue

        canonical_codes.add(code)
        code_to_city_name[code] = city_name
        city_name_to_code[city_name.strip().upper()] = code

        for route in item.get("routes", []):
            airport = (route.get("airport") or "").strip().upper()
            if airport:
                airport_to_code[airport] = code

    return {
        "code_to_city_name": code_to_city_name,
        "canonical_codes": canonical_codes,
        "city_name_to_code": city_name_to_code,
        "airport_to_code": airport_to_code,
    }


def load_city_name_to_id(connection) -> dict[str, int]:
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, city_name FROM city")
        rows = cursor.fetchall()
    return {city_name.strip().upper(): int(city_id) for city_id, city_name in rows if city_name}


def parse_collected_at(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


def select_latest_google_records(records: list[dict]) -> list[dict]:
    latest_by_key: dict[tuple[str, str], dict] = {}
    latest_hotel_by_key: dict[tuple[str, str], tuple[datetime, int]] = {}

    for record in records:
        entity = record.get("entity", {})
        payload = record.get("payload", {})
        city_code = (entity.get("city_id") or entity.get("city_code") or "").strip().upper()
        year_month = (entity.get("year_month") or "").strip()
        collected_at = payload.get("collected_at")

        if not city_code or not year_month or not collected_at:
            continue

        collected_at_dt = parse_collected_at(collected_at)
        hotel_price = payload.get("hotel_price")
        if hotel_price is not None:
            previous_hotel = latest_hotel_by_key.get((city_code, year_month))
            if previous_hotel is None or collected_at_dt > previous_hotel[0]:
                latest_hotel_by_key[(city_code, year_month)] = (collected_at_dt, hotel_price)

        row = {
            "city_code": city_code,
            "year_month": year_month,
            "origin_airport": entity.get("origin_airport"),
            "avg_hotel_price": payload.get("hotel_price"),
            "stops": payload.get("typical_stops_count"),
            "flight_duration": payload.get("min_duration_minutes", payload.get("avg_duration_minutes")),
            "peak_month_list": payload.get("peak_season_months_list"),
            "off_month_list": payload.get("off_season_months_list"),
            "flight_collected_date": collected_at,
            "hotel_collected_date": collected_at,
        }

        key = (city_code, year_month)
        previous = latest_by_key.get(key)
        if previous is None or collected_at_dt > parse_collected_at(previous["flight_collected_date"]):
            latest_by_key[key] = row

    for key, row in latest_by_key.items():
        if row["avg_hotel_price"] is None and key in latest_hotel_by_key:
            row["avg_hotel_price"] = latest_hotel_by_key[key][1]

    return list(latest_by_key.values())


def resolve_trip_city_code(entity: dict, mapping_indexes: dict[str, dict] | None) -> str:
    city_code = (entity.get("city_code") or entity.get("city_id") or "").strip().upper()
    if not mapping_indexes or not city_code:
        return city_code

    if city_code in mapping_indexes["canonical_codes"]:
        return city_code

    dest_airport = (entity.get("dest_airport") or "").strip().upper()
    origin_airport = (entity.get("origin") or "").strip().upper()
    city_name_en = (entity.get("city_name_en") or entity.get("city_name") or "").strip().upper()
    return (
        mapping_indexes["airport_to_code"].get(dest_airport)
        or mapping_indexes["airport_to_code"].get(origin_airport)
        or mapping_indexes["city_name_to_code"].get(city_name_en)
        or city_code
    )


def compute_trip_monthly_averages(
    records: list[dict], mapping_indexes: dict[str, dict] | None = None
) -> dict[tuple[str, str], int]:
    grouped: dict[tuple[str, str], list[int]] = defaultdict(list)

    for record in records:
        entity = record.get("entity", {})
        payload = record.get("payload", {})
        city_code = resolve_trip_city_code(entity, mapping_indexes)
        event_time = (record.get("event_time") or "").strip()
        price = payload.get("price")

        if not city_code or len(event_time) < 7 or price is None:
            continue

        year_month = event_time[:7]
        grouped[(city_code, year_month)].append(int(price))

    return {
        key: round(sum(values) / len(values))
        for key, values in grouped.items()
        if values
    }


def build_flight_summary_rows(
    google_rows: list[dict],
    trip_averages: dict[tuple[str, str], int],
    code_to_city_name: dict[str, str],
    city_name_to_id: dict[str, int],
) -> tuple[list[dict], list[dict]]:
    rows: list[dict] = []
    unmatched_codes: set[str] = set()

    for google_row in google_rows:
        city_code = google_row["city_code"]
        city_name = code_to_city_name.get(city_code)
        if city_name is None:
            unmatched_codes.add(city_code)
            continue

        city_id = city_name_to_id.get(city_name.strip().upper())
        if city_id is None:
            unmatched_codes.add(city_code)
            continue

        rows.append(
            {
                "city_id": city_id,
                "target_year_month": google_row["year_month"],
                "origin_airport": google_row["origin_airport"],
                "avg_flight_price": trip_averages.get((city_code, google_row["year_month"])),
                "avg_hotel_price": google_row["avg_hotel_price"],
                "stops": google_row["stops"],
                "flight_duration": google_row["flight_duration"],
                "peak_month_list": google_row["peak_month_list"],
                "off_month_list": google_row["off_month_list"],
                "flight_collected_date": google_row["flight_collected_date"],
                "hotel_collected_date": google_row["hotel_collected_date"],
            }
        )

    if unmatched_codes:
        joined = ", ".join(sorted(unmatched_codes))
        raise RuntimeError(f"Unmatched city codes for local flight_summary ETL: {joined}")

    return fill_missing_summary_metrics(rows)


def upsert_flight_summary(rows: list[dict], connection) -> None:
    sql = """
    REPLACE INTO flight_summary
    (
        city_id,
        target_year_month,
        origin_airport,
        avg_flight_price,
        avg_hotel_price,
        stops,
        flight_duration,
        peak_month_list,
        off_month_list,
        flight_collected_date,
        hotel_collected_date,
        created_at,
        updated_at,
        is_deleted
    )
    VALUES
    (
        %(city_id)s,
        %(target_year_month)s,
        %(origin_airport)s,
        %(avg_flight_price)s,
        %(avg_hotel_price)s,
        %(stops)s,
        %(flight_duration)s,
        %(peak_month_list)s,
        %(off_month_list)s,
        %(flight_collected_date)s,
        %(hotel_collected_date)s,
        NOW(6),
        NOW(6),
        b'0'
    )
    """

    with connection.cursor() as cursor:
        cursor.executemany(sql, rows)
    connection.commit()


def main():
    args = parse_args()

    try:
        import pymysql
    except ImportError as exc:
        raise RuntimeError("pymysql is required for local_flight_summary_etl.py") from exc

    google_records = load_jsonl(Path(args.google_path))
    trip_records = load_jsonl(Path(args.trip_path))
    mapping_indexes = load_mapping_indexes(Path(args.mapping_path))
    google_rows = select_latest_google_records(google_records)
    trip_averages = compute_trip_monthly_averages(trip_records, mapping_indexes)
    connection_settings = resolve_db_connection_settings(args)

    connection = pymysql.connect(
        host=connection_settings["host"],
        port=connection_settings["port"],
        user=args.db_user,
        password=args.db_password,
        database=connection_settings["database"],
        autocommit=False,
    )
    try:
        city_name_to_id = load_city_name_to_id(connection)
        summary_rows, missing_value_alerts = build_flight_summary_rows(
            google_rows,
            trip_averages,
            mapping_indexes["code_to_city_name"],
            city_name_to_id,
        )
        upsert_flight_summary(summary_rows, connection)
    finally:
        connection.close()

    print(
        json.dumps(
            {
                "rows_upserted": len(summary_rows),
                "missing_value_alerts": missing_value_alerts,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
