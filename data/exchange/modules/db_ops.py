"""Exchange DB operations."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRICE_CRAWLING_DIR = os.path.join(os.path.dirname(ROOT_DIR), "price_crawling")
if PRICE_CRAWLING_DIR not in sys.path:
    sys.path.append(PRICE_CRAWLING_DIR)


def upsert_exchange_row(conn, payload: Dict[str, Any]) -> None:
    """Upsert exchanges row by currency + event_date."""
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT id FROM `exchanges` WHERE currency=%s AND event_date=%s AND is_deleted=FALSE ORDER BY id DESC LIMIT 1",
            (payload["currency"], payload["event_date"]),
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                """
                UPDATE `exchanges`
                SET display_unit=%s,
                    display_symbol=%s,
                    rate_1krw_to_cur=%s,
                    krw_per_1cur=%s,
                    krw_per_display_unit=%s,
                    updated_at=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (
                    payload["display_unit"],
                    payload["display_symbol"],
                    payload["rate_1krw_to_cur"],
                    payload["krw_per_1cur"],
                    payload["krw_per_display_unit"],
                    row[0],
                ),
            )
        else:
            cursor.execute(
                """
                INSERT INTO `exchanges` (
                    currency,
                    display_unit,
                    display_symbol,
                    rate_1krw_to_cur,
                    krw_per_1cur,
                    krw_per_display_unit,
                    event_date,
                    created_at,
                    updated_at,
                    is_deleted
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    payload["currency"],
                    payload["display_unit"],
                    payload["display_symbol"],
                    payload["rate_1krw_to_cur"],
                    payload["krw_per_1cur"],
                    payload["krw_per_display_unit"],
                    payload["event_date"],
                    datetime.now(),
                    datetime.now(),
                    False,
                ),
            )
    conn.commit()


def sync_county_currencies(conn, country_currency_map: Dict[str, str]) -> None:
    """Sync country currency in `country` table."""
    with conn.cursor() as cursor:
        for country_name, currency in country_currency_map.items():
            cursor.execute(
                """
                UPDATE `country`
                SET currency=%s,
                    updated_at=CURRENT_TIMESTAMP
                WHERE country_name=%s AND is_deleted=FALSE
                """,
                (currency, country_name),
            )
    conn.commit()


def prepare_exchange_db():
    """Prepare DB connection and ensure tables exist."""
    create_tables_if_not_exists = None
    get_db_connection = None

    import_targets = (
        "exchange_worker.db_init",
        "db_init",
        "livingcost_worker.db_init",
        "danger_worker.db_init",
        "crolling_gpt.db_init",
    )

    for module_path in import_targets:
        try:
            module = __import__(module_path, fromlist=["create_tables_if_not_exists", "get_db_connection"])
            create_tables_if_not_exists = getattr(module, "create_tables_if_not_exists")
            get_db_connection = getattr(module, "get_db_connection")
            break
        except ModuleNotFoundError:
            continue

    if create_tables_if_not_exists is None or get_db_connection is None:
        raise ModuleNotFoundError("No usable db_init module found. Tried: " + ", ".join(import_targets))

    conn = get_db_connection()
    create_tables_if_not_exists(conn)
    return conn
