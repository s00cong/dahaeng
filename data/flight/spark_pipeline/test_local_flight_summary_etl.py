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
                "min_duration_minutes": 120,
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
                "min_duration_minutes": 130,
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


def test_build_flight_summary_rows_fills_missing_prices_from_other_month_before_zero():
    google_rows = [
        {
            "city_code": "PAR",
            "year_month": "2026-04",
            "origin_airport": "ICN",
            "avg_hotel_price": None,
            "stops": 0,
            "flight_duration": 720,
            "peak_month_list": "6,7,8",
            "off_month_list": "1,2",
            "flight_collected_date": "2026-03-10 10:00:00",
            "hotel_collected_date": "2026-03-10 10:00:00",
        },
        {
            "city_code": "PAR",
            "year_month": "2026-05",
            "origin_airport": "ICN",
            "avg_hotel_price": 300000,
            "stops": 0,
            "flight_duration": 720,
            "peak_month_list": "6,7,8",
            "off_month_list": "1,2",
            "flight_collected_date": "2026-03-20 10:00:00",
            "hotel_collected_date": "2026-03-20 10:00:00",
        },
    ]
    trip_averages = {("PAR", "2026-05"): 800000}

    rows, missing_value_alerts = local_flight_summary_etl.build_flight_summary_rows(
        google_rows,
        trip_averages,
        {"PAR": "Paris"},
        {"PARIS": 10},
    )

    assert rows == [
        {
            "city_id": 10,
            "target_year_month": "2026-04",
            "origin_airport": "ICN",
            "avg_flight_price": 800000,
            "avg_hotel_price": 300000,
            "stops": 0,
            "flight_duration": 720,
            "peak_month_list": "6,7,8",
            "off_month_list": "1,2",
            "flight_collected_date": "2026-03-10 10:00:00",
            "hotel_collected_date": "2026-03-10 10:00:00",
        },
        {
            "city_id": 10,
            "target_year_month": "2026-05",
            "origin_airport": "ICN",
            "avg_flight_price": 800000,
            "avg_hotel_price": 300000,
            "stops": 0,
            "flight_duration": 720,
            "peak_month_list": "6,7,8",
            "off_month_list": "1,2",
            "flight_collected_date": "2026-03-20 10:00:00",
            "hotel_collected_date": "2026-03-20 10:00:00",
        },
    ]
    assert missing_value_alerts == []


def test_build_flight_summary_rows_uses_zero_and_alert_when_city_has_no_price_any_month():
    google_rows = [
        {
            "city_code": "ROM",
            "year_month": "2026-04",
            "origin_airport": "ICN",
            "avg_hotel_price": None,
            "stops": 0,
            "flight_duration": 720,
            "peak_month_list": "6,7,8",
            "off_month_list": "1,2",
            "flight_collected_date": "2026-03-10 10:00:00",
            "hotel_collected_date": "2026-03-10 10:00:00",
        }
    ]

    rows, missing_value_alerts = local_flight_summary_etl.build_flight_summary_rows(
        google_rows,
        {},
        {"ROM": "Rome"},
        {"ROME": 20},
    )

    assert rows == [
        {
            "city_id": 20,
            "target_year_month": "2026-04",
            "origin_airport": "ICN",
            "avg_flight_price": 0,
            "avg_hotel_price": 0,
            "stops": 0,
            "flight_duration": 720,
            "peak_month_list": "6,7,8",
            "off_month_list": "1,2",
            "flight_collected_date": "2026-03-10 10:00:00",
            "hotel_collected_date": "2026-03-10 10:00:00",
        }
    ]
    assert missing_value_alerts == [
        {
            "city_id": 20,
            "year_month": "2026-04",
            "metric": "avg_flight_price",
        },
        {
            "city_id": 20,
            "year_month": "2026-04",
            "metric": "avg_hotel_price",
        },
    ]
