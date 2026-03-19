import sys
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import local_calendar_etl


def test_parse_args_supports_mongo_db_override(monkeypatch):
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "local_calendar_etl.py",
            "--mongo-db",
            "dahaeng",
        ],
    )

    args = local_calendar_etl.parse_args()

    assert args.mongo_db == "dahaeng"


def test_resolve_mongo_db_prefers_database_name_from_uri():
    mongo_db = local_calendar_etl.resolve_mongo_db_name(
        "mongodb://mongodb:27017/dahaeng",
        "dahang",
    )

    assert mongo_db == "dahaeng"


def test_resolve_mongo_db_falls_back_to_argument_when_uri_has_no_path():
    mongo_db = local_calendar_etl.resolve_mongo_db_name(
        "mongodb://mongodb:27017",
        "dahang",
    )

    assert mongo_db == "dahang"
