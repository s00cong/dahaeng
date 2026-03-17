"""danger worker entrypoint."""

from __future__ import annotations

try:
    from danger.modules.db_ops import attach_country_ids, prepare_danger_db, upsert_danger_row
    from danger.modules.fetchers import fetch_special_warning_country_items, fetch_warning_country_items
    from danger.modules.merge_ops import merge_country_danger_payloads
except ModuleNotFoundError:
    from modules.db_ops import attach_country_ids, prepare_danger_db, upsert_danger_row
    from modules.fetchers import fetch_special_warning_country_items, fetch_warning_country_items
    from modules.merge_ops import merge_country_danger_payloads


def run() -> None:
    """Fetch/merge warning data and upsert into existing DB tables."""
    conn = prepare_danger_db()
    try:
        warning_items = fetch_warning_country_items()
        special_items = fetch_special_warning_country_items()
        merged_rows = merge_country_danger_payloads(warning_items, special_items)
        merged_rows = attach_country_ids(conn, merged_rows)
        for row in merged_rows:
            upsert_danger_row(conn, row)
    finally:
        conn.close()


def main() -> None:
    run()


if __name__ == "__main__":
    main()
