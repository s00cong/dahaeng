"""Crawl livingcost and upsert country/city costs into DB only."""

import time
from typing import Any, Dict, List

from scrapling.fetchers import Fetcher

from .db_ops import (
    get_city_id_by_country_city_name,
    get_country_id_by_name,
    seed_locations_if_missing,
    soft_delete_existing_price_data,
    upsert_city_cost,
    upsert_country_cost,
)
from .scrape_ops import extract_selected_prices_from_cost_page
from .text_utils import normalize_key
from .url_resolver import build_verified_url_indexes, resolve_urls_from_verified


def run_batch(
    countries_cities: Dict[str, List[str]],
    target_schema: Dict[str, List[str]],
    verified_urls: Dict[str, Any],
    sleep_seconds: float = 1.0,
) -> None:
    fetcher = Fetcher()
    country_url_index, city_url_index = build_verified_url_indexes(verified_urls)

    try:
        try:
            from livingcost.db_init import create_tables_if_not_exists, get_db_connection
        except ModuleNotFoundError:
            from db_init import create_tables_if_not_exists, get_db_connection
    except ModuleNotFoundError as exc:
        raise RuntimeError("DB module import failed. Install pymysql and verify db_init.py path.") from exc

    db_conn = get_db_connection()
    try:
        create_tables_if_not_exists(db_conn)
        soft_delete_existing_price_data(db_conn)
        seed_locations_if_missing(db_conn, countries_cities)
        country_id_map: Dict[str, int] = {}
        city_id_map: Dict[tuple[str, str], int] = {}

        for country, cities in countries_cities.items():
            country_id = get_country_id_by_name(db_conn, country)
            if country_id is not None:
                country_id_map[country] = country_id
            for city in cities:
                city_id = get_city_id_by_country_city_name(db_conn, country, city)
                if city_id is not None:
                    city_id_map[(country, city)] = city_id

        for country, cities in countries_cities.items():
            print(f"\n=== {country} ===")

            country_url, _ = resolve_urls_from_verified(country, "", country_url_index, city_url_index)
            country_id = country_id_map.get(country)
            if country_id is None:
                print(f"[ERROR] missing country id: {country}")
                continue

            try:
                country_data = extract_selected_prices_from_cost_page(fetcher, country_url, target_schema)
                upsert_country_cost(db_conn, country_id, country_data)
                print(f"[OK] {country} - COUNTRY -> {country_url}")
            except Exception as exc:
                print(f"[ERROR] failed country fetch/insert: {country} -> {exc}")

            normalized_country = normalize_key(country)
            normalized_cities = [normalize_key(city_name) for city_name in cities]
            should_skip_country_named_city = len(cities) == 1 and normalized_cities[0] == normalized_country
            target_cities = [] if should_skip_country_named_city else cities

            for city in target_cities:
                _, city_url = resolve_urls_from_verified(country, city, country_url_index, city_url_index)
                if not city_url:
                    print(f"[MISS] {country} - {city} (city url not found)")
                    continue

                city_id = city_id_map.get((country, city))
                if city_id is None:
                    print(f"[ERROR] missing city id: {country} - {city}")
                    continue

                try:
                    city_data = extract_selected_prices_from_cost_page(fetcher, city_url, target_schema)
                except Exception as exc:
                    print(f"[ERROR] failed city fetch: {country} - {city} -> {exc}")
                    continue

                try:
                    upsert_city_cost(db_conn, city_id, city_data)
                except Exception as exc:
                    print(f"[ERROR] failed city DB insert: {country} - {city} -> {exc}")
                    continue

                print(f"[OK] {country} - {city} -> {city_url}")
                time.sleep(sleep_seconds)

        print("\nDONE")
    finally:
        db_conn.close()
