"""Persist danger rows with resolved country ids."""

from __future__ import annotations

import os
import re
import sys
from typing import Iterable, Optional

try:
    from danger.modules.country_name_map import normalize_country_name
except ModuleNotFoundError:
    from modules.country_name_map import normalize_country_name

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE_DIR = os.path.dirname(ROOT_DIR)
PRICE_CRAWLING_DIR = os.path.join(WORKSPACE_DIR, "price_crawling")
if WORKSPACE_DIR not in sys.path:
    sys.path.append(WORKSPACE_DIR)
if PRICE_CRAWLING_DIR not in sys.path:
    sys.path.append(PRICE_CRAWLING_DIR)


def prepare_danger_db():
    """Open DB connection only (no DDL)."""
    try:
        from crolling_gpt.db_init import get_db_connection
    except ModuleNotFoundError:
        try:
            from danger.db_init import get_db_connection
        except ModuleNotFoundError:
            try:
                from livingcost.db_init import get_db_connection
            except ModuleNotFoundError:
                from db_init import get_db_connection

    return get_db_connection()


def _country_lookup(conn, country_name: str) -> Optional[int]:
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT id
            FROM `country`
            WHERE country_name=%s
              AND (is_deleted=FALSE OR is_deleted IS NULL)
            LIMIT 1
            """,
            (country_name,),
        )
        row = cursor.fetchone()
        return None if not row else int(row[0])


def resolve_country_id(conn, country_en_name: Optional[str], candidate_city_names: Iterable[str]) -> Optional[int]:
    if country_en_name:
        country_id = _country_lookup(conn, country_en_name)
        if country_id is not None:
            return country_id

        normalized = normalize_country_name(country_en_name)
        if normalized and normalized != country_en_name:
            country_id = _country_lookup(conn, normalized)
            if country_id is not None:
                return country_id

    with conn.cursor() as cursor:
        for city_name in candidate_city_names:
            if not city_name:
                continue
            cursor.execute(
                """
                SELECT co.id
                FROM `city` c
                JOIN `country` co ON c.country_id = co.id
                WHERE c.city_name=%s
                  AND (c.is_deleted=FALSE OR c.is_deleted IS NULL)
                  AND (co.is_deleted=FALSE OR co.is_deleted IS NULL)
                ORDER BY co.id ASC
                LIMIT 1
                """,
                (city_name,),
            )
            row = cursor.fetchone()
            if row:
                return int(row[0])
    return None


def _extract_candidate_city_names(row: dict) -> list[str]:
    candidates: list[str] = []
    for key in ("city_name", "evacuate_region_ty", "forbidden__region_ty"):
        raw = row.get(key)
        if not raw or not isinstance(raw, str):
            continue
        for part in re.split(r"[,;/|]", raw):
            name = part.strip()
            if name and len(name) <= 50:
                candidates.append(name)

    deduped: list[str] = []
    seen = set()
    for name in candidates:
        lowered = name.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        deduped.append(name)
    return deduped


def attach_country_ids(conn, merged_rows):
    """Attach resolved country_id to merged danger rows."""
    attached_rows = []
    for row in merged_rows:
        new_row = dict(row)
        city_candidates = _extract_candidate_city_names(new_row)
        resolved_country_id = resolve_country_id(conn, new_row.get("country_en_name"), city_candidates)

        new_row["country_id"] = resolved_country_id

        if not new_row.get("id"):
            new_row["id"] = resolved_country_id or 0
        attached_rows.append(new_row)
    return attached_rows


def upsert_danger_row(conn, payload):
    """Upsert danger row by country_id."""
    if payload.get("country_id") is None:
        print(f"[SKIP] unresolved country_id: {payload.get('country_en_name')}")
        return

    with conn.cursor() as cursor:
        cursor.execute("SELECT id FROM `danger` WHERE country_id=%s LIMIT 1", (payload["country_id"],))
        existing_row = cursor.fetchone()
        values = (
            payload.get("attention"),
            payload.get("attention_partial"),
            payload.get("attention_note"),
            payload.get("ban_note"),
            payload.get("ban_yn_partial"),
            payload.get("ban_yna"),
            payload.get("control"),
            payload.get("control_partial"),
            payload.get("control_note"),
            payload.get("country_name"),
            payload.get("country_en_name"),
            payload.get("limita"),
            payload.get("limita_partial"),
            payload.get("limita_note"),
            payload.get("evacuate_rcmnd_remark"),
            payload.get("evacuate_region_ty"),
            payload.get("forbidden_rcmnd_remark"),
            payload.get("forbidden__region_ty"),
        )

        if existing_row:
            cursor.execute(
                """
                UPDATE `danger`
                SET attention=%s,
                    attention_partial=%s,
                    attention_note=%s,
                    ban_note=%s,
                    ban_yn_partial=%s,
                    ban_yna=%s,
                    control=%s,
                    control_partial=%s,
                    control_note=%s,
                    country_name=%s,
                    country_en_name=%s,
                    limita=%s,
                    limita_partial=%s,
                    limita_note=%s,
                    evacuate_rcmnd_remark=%s,
                    evacuate_region_ty=%s,
                    forbidden_rcmnd_remark=%s,
                    forbidden__region_ty=%s,
                    is_deleted=FALSE,
                    updated_at=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                values + (existing_row[0],),
            )
        else:
            cursor.execute(
                """
                INSERT INTO `danger` (
                    id, country_id, attention, attention_partial, attention_note,
                    ban_note, ban_yn_partial, ban_yna, control, control_partial, control_note,
                    country_name, country_en_name, limita, limita_partial, limita_note,
                    evacuate_rcmnd_remark, evacuate_region_ty, forbidden_rcmnd_remark, forbidden__region_ty,
                    is_deleted, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (
                    payload["id"],
                    payload["country_id"],
                )
                + values
                + (False,),
            )
    conn.commit()
