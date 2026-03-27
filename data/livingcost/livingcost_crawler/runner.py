"""Crawl livingcost and upsert country/city costs into DB only."""

import time
from typing import Any, Dict, List

from scrapling.fetchers import Fetcher

from .db_ops import (
    bulk_upsert_city_costs,
    bulk_upsert_country_costs,
    get_city_id_by_country_city_name,
    get_country_id_by_name,
    seed_locations_if_missing,
    soft_delete_existing_price_data,
)
from .scrape_ops import extract_selected_prices_from_cost_page
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
        seed_locations_if_missing(db_conn, countries_cities)
        country_id_map: Dict[str, int] = {}
        city_id_map: Dict[tuple[str, str], int] = {}
        successful_country_rows: List[tuple[int, Dict[str, Any]]] = []
        successful_city_rows: List[tuple[int, Dict[str, Any]]] = []

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

            print(f"[CRAWL] country={country} country_id={country_id} url={country_url}")
            try:
                country_data = extract_selected_prices_from_cost_page(fetcher, country_url, target_schema)
                successful_country_rows.append((country_id, country_data))
                print(f"[OK] country={country} country_id={country_id} scope=COUNTRY url={country_url}")
            except Exception as exc:
                print(f"[ERROR] failed country fetch: country={country} country_id={country_id} error={exc}")

            for city in cities:
                _, city_url = resolve_urls_from_verified(country, city, country_url_index, city_url_index)
                if not city_url:
                    print(f"[MISS] country={country} country_id={country_id} city={city} (city url not found)")
                    continue

                city_id = city_id_map.get((country, city))
                if city_id is None:
                    print(f"[ERROR] missing city id: country={country} country_id={country_id} city={city}")
                    continue

                print(
                    f"[CRAWL] country={country} country_id={country_id} "
                    f"city={city} city_id={city_id} url={city_url}"
                )
                try:
                    city_data = extract_selected_prices_from_cost_page(fetcher, city_url, target_schema)
                except Exception as exc:
                    print(
                        f"[ERROR] failed city fetch: country={country} country_id={country_id} "
                        f"city={city} city_id={city_id} error={exc}"
                    )
                    continue

                try:
                    successful_city_rows.append((city_id, city_data))
                except Exception as exc:
                    print(
                        f"[ERROR] failed city staging: country={country} country_id={country_id} "
                        f"city={city} city_id={city_id} error={exc}"
                    )
                    continue

                print(
                    f"[OK] country={country} country_id={country_id} "
                    f"city={city} city_id={city_id} url={city_url}"
                )
                time.sleep(sleep_seconds)

        if successful_country_rows or successful_city_rows:
            soft_delete_existing_price_data(db_conn)
            bulk_upsert_country_costs(db_conn, successful_country_rows)
            bulk_upsert_city_costs(db_conn, successful_city_rows)
            db_conn.commit()

        print("\nDONE")
    finally:
        db_conn.close()
