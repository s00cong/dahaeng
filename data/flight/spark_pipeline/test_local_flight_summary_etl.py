import sys
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import local_flight_summary_etl


def test_parse_args_supports_db_url_override(monkeypatch):
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "local_flight_summary_etl.py",
            "--db-url",
            "jdbc:mysql://mysql:3306/dahaeng",
        ],
    )

    args = local_flight_summary_etl.parse_args()

    assert args.db_url == "jdbc:mysql://mysql:3306/dahaeng"


def test_resolve_db_connection_settings_prefers_db_url():
    args = type(
        "Args",
        (),
        {
            "db_url": "jdbc:mysql://mysql:3306/dahaeng",
            "db_host": "localhost",
            "db_port": 3307,
            "db_name": "dahang",
        },
    )()

    settings = local_flight_summary_etl.resolve_db_connection_settings(args)

    assert settings == {"host": "mysql", "port": 3306, "database": "dahaeng"}


def test_select_latest_google_records_carries_forward_hotel_price_from_same_city_month():
    records = [
        {
            "entity": {"city_id": "NEW_YORK", "year_month": "2026-04", "origin_airport": "ICN"},
            "payload": {
                "collected_at": "2026-03-10 10:00:00",
                "hotel_price": 426601,
                "typical_stops_count": 0,
                "avg_duration_minutes": 120,
                "peak_season_months_list": "3,4",
                "off_season_months_list": "5,6",
            },
        },
        {
            "entity": {"city_id": "NEW_YORK", "year_month": "2026-04", "origin_airport": "ICN"},
            "payload": {
                "collected_at": "2026-03-13 10:00:00",
                "hotel_price": None,
                "typical_stops_count": 1,
                "avg_duration_minutes": 130,
                "peak_season_months_list": "3,4",
                "off_season_months_list": "5,6",
            },
        },
    ]

    rows = local_flight_summary_etl.select_latest_google_records(records)

    assert rows == [
        {
            "city_code": "NEW_YORK",
            "year_month": "2026-04",
            "origin_airport": "ICN",
            "avg_hotel_price": 426601,
            "stops": 1,
            "flight_duration": 130,
            "peak_month_list": "3,4",
            "off_month_list": "5,6",
            "flight_collected_date": "2026-03-13 10:00:00",
            "hotel_collected_date": "2026-03-13 10:00:00",
        }
    ]
