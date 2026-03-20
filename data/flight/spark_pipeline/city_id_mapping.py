from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse


def normalize_city_join_key(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip().upper()
    return normalized or None


def build_city_id_lookup(rows: Iterable[dict]) -> dict[str, int]:
    lookup: dict[str, int] = {}

    for row in rows:
        city_id = int(row["id"])
        normalized_name = normalize_city_join_key(row.get("city_name"))
        if normalized_name is None:
            continue

        existing = lookup.get(normalized_name)
        if existing is not None and existing != city_id:
            raise ValueError(f"Duplicate city name after normalization: {normalized_name}")

        lookup[normalized_name] = city_id

    return lookup


def find_unmatched_city_names(
    city_names: Iterable[str | None], city_lookup: dict[str, int]
) -> list[str]:
    unmatched = set()

    for city_name in city_names:
        normalized = normalize_city_join_key(city_name)
        if normalized is None:
            continue
        if normalized not in city_lookup:
            unmatched.add(normalized)

    return sorted(unmatched)


def parse_mysql_connection_info(db_url: str) -> dict[str, int | str]:
    normalized_url = db_url.removeprefix("jdbc:")
    parsed = urlparse(normalized_url)

    if parsed.scheme != "mysql":
        raise ValueError(f"Unsupported DB URL: {db_url}")

    database = parsed.path.lstrip("/")
    if not parsed.hostname or not parsed.port or not database:
        raise ValueError(f"Incomplete DB URL: {db_url}")

    return {
        "host": parsed.hostname,
        "port": parsed.port,
        "database": database,
    }


def resolve_tripcom_direction(entity: dict) -> str | None:
    direction = entity.get("direction")
    normalized_direction = normalize_city_join_key(direction)
    if normalized_direction in {"OUTBOUND", "INBOUND"}:
        return normalized_direction.lower()

    origin = normalize_city_join_key(entity.get("origin"))
    if origin is None:
        return None

    return "outbound" if origin == "ICN" else "inbound"


def load_code_to_city_name(mapping_path: str | Path) -> dict[str, str]:
    path = Path(mapping_path)
    mapping = json.loads(path.read_text(encoding="utf-8"))
    return {
        (item.get("city_code") or "").strip().upper(): (item.get("city_name_en") or "").strip()
        for item in mapping
        if item.get("city_code") and item.get("city_name_en")
    }
