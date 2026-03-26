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
            "stops": 0,
            "flight_duration": 120,
            "peak_month_list": "3,4",
            "off_month_list": "5,6",
            "flight_collected_date": "2026-03-13 10:00:00",
            "hotel_collected_date": "2026-03-13 10:00:00",
        }
    ]


def test_select_latest_google_records_uses_shortest_duration_and_matching_stops_for_city_month():
    records = [
        {
            "entity": {"city_id": "MEXICO_CITY", "year_month": "2026-06", "origin_airport": "ICN"},
            "payload": {
                "collected_at": "2026-03-10 10:00:00",
                "hotel_price": 500000,
                "typical_stops_count": 0,
                "min_duration_minutes": 865,
                "peak_season_months_list": "3,4",
                "off_season_months_list": "5,6",
            },
        },
        {
            "entity": {"city_id": "MEXICO_CITY", "year_month": "2026-06", "origin_airport": "ICN"},
            "payload": {
                "collected_at": "2026-03-13 10:00:00",
                "hotel_price": 510000,
                "typical_stops_count": 1,
                "min_duration_minutes": 1020,
                "peak_season_months_list": "3,4",
                "off_season_months_list": "5,6",
            },
        },
    ]

    rows = local_flight_summary_etl.select_latest_google_records(records)

    assert rows == [
        {
            "city_code": "MEXICO_CITY",
            "year_month": "2026-06",
            "origin_airport": "ICN",
            "avg_hotel_price": 510000,
            "stops": 0,
            "flight_duration": 865,
            "peak_month_list": "3,4",
            "off_month_list": "5,6",
            "flight_collected_date": "2026-03-13 10:00:00",
            "hotel_collected_date": "2026-03-13 10:00:00",
        }
    ]


def test_select_latest_google_records_uses_shortest_duration_for_entire_city_across_months():
    records = [
        {
            "entity": {"city_id": "DEBRECEN", "year_month": "2026-04", "origin_airport": "ICN"},
            "payload": {
                "collected_at": "2026-03-11 11:06:42",
                "hotel_price": 100000,
                "typical_stops_count": 2,
                "min_duration_minutes": 2345,
                "peak_season_months_list": "6,7,8,9",
                "off_season_months_list": "1,2,3,4",
            },
        },
        {
            "entity": {"city_id": "DEBRECEN", "year_month": "2026-06", "origin_airport": "ICN"},
            "payload": {
                "collected_at": "2026-03-13 03:08:29",
                "hotel_price": 100000,
                "typical_stops_count": 2,
                "min_duration_minutes": 3520,
                "peak_season_months_list": "6,7,8,9",
                "off_season_months_list": "1,2,3,4",
            },
        },
    ]

    rows = sorted(
        local_flight_summary_etl.select_latest_google_records(records),
        key=lambda row: row["year_month"],
    )

    assert rows == [
        {
            "city_code": "DEBRECEN",
            "year_month": "2026-04",
            "origin_airport": "ICN",
            "avg_hotel_price": 100000,
            "stops": 2,
            "flight_duration": 2345,
            "peak_month_list": "6,7,8,9",
            "off_month_list": "1,2,3,4",
            "flight_collected_date": "2026-03-11 11:06:42",
            "hotel_collected_date": "2026-03-11 11:06:42",
        },
        {
            "city_code": "DEBRECEN",
            "year_month": "2026-06",
            "origin_airport": "ICN",
            "avg_hotel_price": 100000,
            "stops": 2,
            "flight_duration": 2345,
            "peak_month_list": "6,7,8,9",
            "off_month_list": "1,2,3,4",
            "flight_collected_date": "2026-03-13 03:08:29",
            "hotel_collected_date": "2026-03-13 03:08:29",
        },
    ]


def test_compute_trip_monthly_averages_sums_outbound_and_inbound_directional_averages():
    records = [
        {
            "event_time": "2026-04-01",
            "entity": {"city_code": "PAR", "direction": "outbound", "origin": "ICN"},
            "payload": {"price": 100000},
        },
        {
            "event_time": "2026-04-02",
            "entity": {"city_code": "PAR", "direction": "outbound", "origin": "ICN"},
            "payload": {"price": 120000},
        },
        {
            "event_time": "2026-04-10",
            "entity": {"city_code": "PAR", "direction": "inbound", "origin": "CDG"},
            "payload": {"price": 200000},
        },
        {
            "event_time": "2026-04-11",
            "entity": {"city_code": "PAR", "direction": "inbound", "origin": "CDG"},
            "payload": {"price": 220000},
        },
    ]

    averages = local_flight_summary_etl.compute_trip_monthly_averages(records)

    assert averages == {("PAR", "2026-04"): 320000}


def test_compute_trip_monthly_averages_keeps_single_direction_average_when_other_side_missing():
    records = [
        {
            "event_time": "2026-04-01",
            "entity": {"city_code": "PAR", "direction": "outbound", "origin": "ICN"},
            "payload": {"price": 100000},
        },
        {
            "event_time": "2026-04-02",
            "entity": {"city_code": "PAR", "direction": "outbound", "origin": "ICN"},
            "payload": {"price": 120000},
        },
    ]

    averages = local_flight_summary_etl.compute_trip_monthly_averages(records)

    assert averages == {("PAR", "2026-04"): 110000}


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
