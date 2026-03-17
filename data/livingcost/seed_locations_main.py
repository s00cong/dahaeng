"""Seed country/city rows from crawl_config into DB."""

from __future__ import annotations

try:
    from livingcost.crawl_config import COUNTRIES_CITIES
    from livingcost.db_init import create_tables_if_not_exists, get_db_connection
    from livingcost.livingcost_crawler.db_ops import seed_locations_if_missing
except ModuleNotFoundError:
    from crawl_config import COUNTRIES_CITIES
    from db_init import create_tables_if_not_exists, get_db_connection
    from livingcost_crawler.db_ops import seed_locations_if_missing


def main() -> None:
    conn = get_db_connection()
    try:
        create_tables_if_not_exists(conn)
        country_ids, city_ids = seed_locations_if_missing(conn, COUNTRIES_CITIES)
        print(f"seed done: countries={len(country_ids)}, cities={len(city_ids)}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
