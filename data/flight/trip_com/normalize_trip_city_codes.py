from __future__ import annotations

import argparse
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MAPPING_PATH = BASE_DIR / "city_airport_mapping.json"
DEFAULT_BRONZE_ROOT = BASE_DIR / "bronze_airticket"
DEFAULT_NORMALIZED_PATH = BASE_DIR.parent / "normalized" / "trip_com.jsonl"


def parse_args():
    parser = argparse.ArgumentParser(description="Normalize Trip.com city_code values to canonical mapping codes")
    parser.add_argument("--mapping-path", default=str(DEFAULT_MAPPING_PATH))
    parser.add_argument("--bronze-root", default=str(DEFAULT_BRONZE_ROOT))
    parser.add_argument("--normalized-path", default=str(DEFAULT_NORMALIZED_PATH))
    parser.add_argument("--skip-bronze", action="store_true")
    parser.add_argument("--skip-normalized", action="store_true")
    return parser.parse_args()


def build_mapping_indexes(mapping_items: list[dict]) -> dict[str, dict]:
    canonical_codes: set[str] = set()
    city_name_en_to_code: dict[str, str] = {}
    city_name_kr_to_code: dict[str, str] = {}
    airport_to_code: dict[str, str] = {}

    for item in mapping_items:
        code = (item.get("city_code") or "").strip().upper()
        city_name_en = (item.get("city_name_en") or "").strip().upper()
        city_name_kr = (item.get("city_name_kr") or "").strip().upper()
        if not code:
            continue

        canonical_codes.add(code)
        if city_name_en:
            city_name_en_to_code[city_name_en] = code
        if city_name_kr:
            city_name_kr_to_code[city_name_kr] = code

        for route in item.get("routes", []):
            airport = (route.get("airport") or "").strip().upper()
            if airport:
                airport_to_code[airport] = code

    return {
        "canonical_codes": canonical_codes,
        "city_name_en_to_code": city_name_en_to_code,
        "city_name_kr_to_code": city_name_kr_to_code,
        "airport_to_code": airport_to_code,
    }


def normalize_record(record: dict, indexes: dict[str, dict]) -> dict:
    entity = record.get("entity")
    if not isinstance(entity, dict):
        return record

    direction = (entity.get("direction") or "").strip().lower()
    origin_airport = (entity.get("origin") or "").strip().upper()
    dest_airport = (entity.get("dest_airport") or "").strip().upper()

    if direction == "inbound":
        entity["dest_airport"] = "ICN"
    elif direction == "outbound":
        entity["origin"] = "ICN"

    city_code = (entity.get("city_code") or entity.get("city_id") or "").strip().upper()
    if city_code in indexes["canonical_codes"]:
        record["entity"] = entity
        return record

    dest_airport = (entity.get("dest_airport") or dest_airport).strip().upper()
    origin_airport = (entity.get("origin") or origin_airport).strip().upper()
    city_name_en = (entity.get("city_name_en") or entity.get("city_name") or "").strip().upper()
    city_name_kr = (entity.get("city_name_kr") or "").strip().upper()

    canonical = (
        indexes["airport_to_code"].get(dest_airport)
        or indexes["airport_to_code"].get(origin_airport)
        or indexes["city_name_en_to_code"].get(city_name_en)
        or indexes["city_name_kr_to_code"].get(city_name_kr)
    )
    if not canonical:
        return record

    entity["city_code"] = canonical
    record["entity"] = entity
    return record


def rewrite_jsonl(path: Path, indexes: dict[str, dict]) -> tuple[int, int]:
    if not path.exists():
        return 0, 0

    updated = 0
    total = 0
    rewritten_lines: list[str] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped:
                continue
            total += 1
            record = json.loads(stripped)
            before = json.dumps(record, ensure_ascii=False, sort_keys=True)
            record = normalize_record(record, indexes)
            after = json.dumps(record, ensure_ascii=False, sort_keys=True)
            if before != after:
                updated += 1
            rewritten_lines.append(json.dumps(record, ensure_ascii=False))

    path.write_text("\n".join(rewritten_lines) + ("\n" if rewritten_lines else ""), encoding="utf-8")
    return total, updated


def iter_jsonl_files(bronze_root: Path):
    if not bronze_root.exists():
        return []
    return sorted(bronze_root.rglob("*.jsonl"))


def main():
    args = parse_args()
    mapping_items = json.loads(Path(args.mapping_path).read_text(encoding="utf-8"))
    indexes = build_mapping_indexes(mapping_items)

    summary = {"bronze_files": 0, "bronze_updated_records": 0, "normalized_updated_records": 0}

    if not args.skip_bronze:
        for path in iter_jsonl_files(Path(args.bronze_root)):
            _, updated = rewrite_jsonl(path, indexes)
            summary["bronze_files"] += 1
            summary["bronze_updated_records"] += updated

    if not args.skip_normalized:
        _, updated = rewrite_jsonl(Path(args.normalized_path), indexes)
        summary["normalized_updated_records"] = updated

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
