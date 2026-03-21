"""
local_calendar_etl.py
=====================
Local MongoDB calendar ETL without Spark.

This variant now requires MariaDB city IDs and no longer generates hash-based IDs.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

from city_id_mapping import (
    build_city_id_lookup,
    find_unmatched_city_names,
    normalize_city_join_key,
    parse_mysql_connection_info,
    resolve_tripcom_direction,
)

from local_flight_summary_etl import load_mapping_indexes


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MAPPING_PATH = BASE_DIR.parent / "trip_com" / "city_airport_mapping.json"
DEFAULT_MONGO_DB = "dahaeng"
TARGET_MONGO_COLLECTION = "flight_price_calendar"


def parse_args():
    parser = argparse.ArgumentParser(description="Local MongoDB Calendar ETL")
    parser.add_argument(
        "--bronze-path",
        default=os.path.join(
            os.path.dirname(__file__), "..", "trip_com", "bronze_airticket"
        ),
        help="Trip.com Bronze base path",
    )
    parser.add_argument(
        "--mongo-uri",
        default="mongodb://localhost:27017",
        help="MongoDB URI",
    )
    parser.add_argument(
        "--mongo-db",
        default=DEFAULT_MONGO_DB,
        help="MongoDB database name",
    )
    parser.add_argument(
        "--db-url",
        default=os.getenv("DB_URL", "jdbc:mysql://localhost:3307/dahang"),
        help="MariaDB JDBC URL",
    )
    parser.add_argument(
        "--db-user",
        default=os.getenv("DB_USERNAME", "root"),
        help="MariaDB username",
    )
    parser.add_argument(
        "--db-password",
        default=os.getenv("DB_PASSWORD", "ssafy"),
        help="MariaDB password",
    )
    parser.add_argument(
        "--mapping-path",
        default=str(DEFAULT_MAPPING_PATH),
        help="Trip.com city mapping JSON path",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Delete existing MongoDB documents before insert",
    )
    return parser.parse_args()


def load_city_id_lookup_from_db(db_url: str, db_user: str, db_password: str) -> dict[str, int]:
    try:
        import pymysql
    except ImportError as exc:
        raise RuntimeError("pymysql is required for local_calendar_etl.py") from exc

    connection_info = parse_mysql_connection_info(db_url)
    connection = pymysql.connect(
        host=connection_info["host"],
        port=connection_info["port"],
        user=db_user,
        password=db_password,
        database=connection_info["database"],
        autocommit=True,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, city_name FROM city")
            rows = cursor.fetchall()
    finally:
        connection.close()

    return build_city_id_lookup(rows)


def resolve_mongo_db_name(mongo_uri: str, fallback_db: str) -> str:
    parsed = urlparse(mongo_uri)
    database_name = parsed.path.lstrip("/")
    if database_name:
        return database_name
    return fallback_db


def resolve_city_id(
    entity: dict, mapping_indexes: dict[str, dict], city_lookup: dict[str, int]
) -> int | None:
    city_code = normalize_city_join_key(entity.get("city_code") or entity.get("city_id"))
    if city_code is None:
        return None

    if city_code in mapping_indexes["canonical_codes"]:
        city_name = (
            mapping_indexes.get("code_to_city_name", {}).get(city_code)
            or entity.get("city_name_en")
            or entity.get("city_name")
        )
        if city_name is None:
            return None
        return city_lookup.get(normalize_city_join_key(city_name))

    dest_airport = normalize_city_join_key(entity.get("dest_airport"))
    origin_airport = normalize_city_join_key(entity.get("origin"))
    city_name_en = normalize_city_join_key(entity.get("city_name_en") or entity.get("city_name"))

    canonical_code = (
        mapping_indexes["airport_to_code"].get(dest_airport)
        or mapping_indexes["airport_to_code"].get(origin_airport)
        or mapping_indexes["city_name_to_code"].get(city_name_en)
        or city_code
    )
    city_name = (
        mapping_indexes.get("code_to_city_name", {}).get(canonical_code)
        or entity.get("city_name_en")
        or entity.get("city_name")
    )
    if city_name is None:
        return None

    return city_lookup.get(normalize_city_join_key(city_name))


def reduce_daily_prices(items: list[dict]) -> list[dict]:
    lowest_by_date: dict[str, int] = {}

    for item in items:
        date = item.get("date")
        price = item.get("price")
        if not date or price is None:
            continue

        existing = lowest_by_date.get(date)
        if existing is None or int(price) < existing:
            lowest_by_date[date] = int(price)

    return [
        {"date": date, "price": lowest_by_date[date]}
        for date in sorted(lowest_by_date)
    ]


def main():
    args = parse_args()
    bronze_path = os.path.abspath(args.bronze_path)
    mongo_db_name = resolve_mongo_db_name(args.mongo_uri, args.mongo_db)

    try:
        from pymongo import MongoClient, ReplaceOne
    except ImportError as exc:
        raise RuntimeError("pymongo is required for local_calendar_etl.py") from exc

    city_lookup = load_city_id_lookup_from_db(args.db_url, args.db_user, args.db_password)
    mapping_indexes = load_mapping_indexes(Path(args.mapping_path))

    print("=" * 60)
    print("Local Calendar ETL")
    print(f"Bronze: {bronze_path}")
    print(f"MongoDB: {args.mongo_uri}")
    print(f"Mongo DB: {mongo_db_name}")
    print("=" * 60)

    dt_dirs = sorted(glob.glob(os.path.join(bronze_path, "dt=*")))
    print(f"[INFO] Found {len(dt_dirs)} collected-date directories")

    docs = []
    unmatched_entities = set()

    for dt_dir in dt_dirs:
        collected_date = os.path.basename(dt_dir).replace("dt=", "")
        collected_compact = collected_date.replace("-", "")
        jsonl_files = glob.glob(os.path.join(dt_dir, "**", "*.jsonl"), recursive=True)

        groups = defaultdict(lambda: {"outbound": [], "inbound": []})
        record_count = 0

        for jsonl_file in jsonl_files:
            with open(jsonl_file, "r", encoding="utf-8") as handle:
                for line in handle:
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    entity = record.get("entity", {})
                    payload = record.get("payload", {})

                    direction = resolve_tripcom_direction(entity)
                    target_date = record.get("event_time", "")
                    price = payload.get("price")

                    city_id = resolve_city_id(entity, mapping_indexes, city_lookup)

                    if city_id is None:
                        raw_city = entity.get("city_code") or entity.get("city_id") or entity.get("city_name_en")
                        if raw_city:
                            unmatched_entities.add(str(raw_city))
                        continue

                    if not target_date or price is None:
                        continue

                    year_month = target_date[:7]
                    if direction not in ("outbound", "inbound"):
                        continue

                    groups[(city_id, year_month)][direction].append(
                        {"date": target_date, "price": int(price)}
                    )
                    record_count += 1

        print(
            f"[INFO] Parsed {record_count} price rows from {collected_date} into {len(groups)} groups"
        )

        for (city_id, year_month), prices in groups.items():
            outbound = reduce_daily_prices(prices["outbound"])
            inbound = reduce_daily_prices(prices["inbound"])

            docs.append(
                {
                    "_id": f"{city_id}-{year_month}-{collected_compact}",
                    "cityId": city_id,
                    "yearMonth": year_month,
                    "collectedDate": collected_date,
                    "outboundDailyPrices": outbound,
                    "inboundDailyPrices": inbound,
                }
            )

    unmatched = find_unmatched_city_names(unmatched_entities, {})
    if unmatched:
        joined = ", ".join(unmatched)
        raise RuntimeError(f"Unmatched city codes in MariaDB city table: {joined}")

    client = MongoClient(args.mongo_uri)
    try:
        collection = client[mongo_db_name][TARGET_MONGO_COLLECTION]

        if args.clear:
            deleted = collection.delete_many({})
            print(f"[CLEAR] Removed {deleted.deleted_count} existing documents")

        if docs:
            operations = [
                ReplaceOne({"_id": document["_id"]}, document, upsert=True)
                for document in docs
            ]
            collection.bulk_write(operations)

        print(f"[INFO] Wrote {len(docs)} documents to {mongo_db_name}.{TARGET_MONGO_COLLECTION}")
        print(f"[INFO] Collection now contains {collection.count_documents({})} documents")
    finally:
        client.close()


if __name__ == "__main__":
    main()
