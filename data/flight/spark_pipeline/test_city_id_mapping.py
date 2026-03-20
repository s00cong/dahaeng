import json
import sys
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import city_id_mapping


def test_load_code_to_city_name_reads_mapping_json(tmp_path):
    mapping_path = tmp_path / "city_airport_mapping.json"
    mapping_path.write_text(
        json.dumps(
            [
                {"city_code": "NEW_YORK", "city_name_en": "New York City"},
                {"city_code": "HAGUE", "city_name_en": "The Hague"},
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    lookup = city_id_mapping.load_code_to_city_name(mapping_path)

    assert lookup == {
        "NEW_YORK": "New York City",
        "HAGUE": "The Hague",
    }
