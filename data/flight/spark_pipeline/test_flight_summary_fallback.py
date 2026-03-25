import sys
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import flight_summary_fallback


def test_fill_missing_metric_by_city_prefers_latest_value_from_other_month():
    rows = [
        {
            "city_id": 1,
            "year_month": "2026-04",
            "avg_flight_price": None,
            "flight_collected_date": "2026-03-13 10:00:00",
        },
        {
            "city_id": 1,
            "year_month": "2026-05",
            "avg_flight_price": 500000,
            "flight_collected_date": "2026-03-20 09:00:00",
        },
        {
            "city_id": 1,
            "year_month": "2026-06",
            "avg_flight_price": 450000,
            "flight_collected_date": "2026-03-18 09:00:00",
        },
    ]

    filled_rows, missing_alerts = flight_summary_fallback.fill_missing_metric_by_city(
        rows,
        metric_key="avg_flight_price",
        collected_date_key="flight_collected_date",
    )

    assert filled_rows[0]["avg_flight_price"] == 500000
    assert missing_alerts == []


def test_fill_missing_metric_by_city_uses_zero_and_alert_when_city_has_no_value():
    rows = [
        {
            "city_id": 7,
            "year_month": "2026-04",
            "avg_hotel_price": None,
            "hotel_collected_date": "2026-03-13 10:00:00",
        }
    ]

    filled_rows, missing_alerts = flight_summary_fallback.fill_missing_metric_by_city(
        rows,
        metric_key="avg_hotel_price",
        collected_date_key="hotel_collected_date",
    )

    assert filled_rows[0]["avg_hotel_price"] == 0
    assert missing_alerts == [
        {
            "city_id": 7,
            "year_month": "2026-04",
            "metric": "avg_hotel_price",
        }
    ]
