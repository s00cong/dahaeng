from __future__ import annotations

from datetime import datetime


TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"


def _parse_optional_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.min
    return datetime.strptime(value, TIMESTAMP_FORMAT)


def fill_missing_metric_by_city(
    rows: list[dict],
    metric_key: str,
    collected_date_key: str,
    city_key: str = "city_id",
    year_month_key: str = "year_month",
) -> tuple[list[dict], list[dict]]:
    latest_value_by_city: dict[object, tuple[datetime, int]] = {}

    for row in rows:
        city_value = row.get(city_key)
        metric_value = row.get(metric_key)
        if city_value is None or metric_value is None:
            continue

        collected_at = _parse_optional_timestamp(row.get(collected_date_key))
        previous = latest_value_by_city.get(city_value)
        if previous is None or collected_at > previous[0]:
            latest_value_by_city[city_value] = (collected_at, int(metric_value))

    filled_rows: list[dict] = []
    missing_alerts: list[dict] = []

    for row in rows:
        filled_row = dict(row)
        if filled_row.get(metric_key) is None:
            fallback = latest_value_by_city.get(filled_row.get(city_key))
            if fallback is None:
                filled_row[metric_key] = 0
                missing_alerts.append(
                    {
                        "city_id": filled_row.get(city_key),
                        "year_month": filled_row.get(year_month_key),
                        "metric": metric_key,
                    }
                )
            else:
                filled_row[metric_key] = fallback[1]
        filled_rows.append(filled_row)

    return filled_rows, missing_alerts


def fill_missing_summary_metrics(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    filled_rows, missing_value_alerts = fill_missing_metric_by_city(
        rows,
        metric_key="avg_flight_price",
        collected_date_key="flight_collected_date",
        year_month_key="target_year_month",
    )
    filled_rows, hotel_alerts = fill_missing_metric_by_city(
        filled_rows,
        metric_key="avg_hotel_price",
        collected_date_key="hotel_collected_date",
        year_month_key="target_year_month",
    )
    return filled_rows, missing_value_alerts + hotel_alerts
