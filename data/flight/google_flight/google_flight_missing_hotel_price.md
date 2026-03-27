# Google Flight Missing Hotel Price

Source: `data/normalized/google_flight.jsonl`

This file lists the records that still have `payload.hotel_price = null` after CSV append, repair, and manual overrides.

## Summary

- `hotel_price = null` rows: `14`
- Unique affected cities: `1`

## Affected Cities

| city_id | city_name_kr | affected_rows | affected_year_months | handling |
|---|---|---:|---|---|
| `BULGAN` | 불간 | 14 | `2026-03, 2026-04, 2026-05, 2026-06, 2026-07, 2026-08` | Keep `null` as "정보없음" |

## Manual Override Applied

The following manual hotel overrides were applied and are no longer null:

| city_id | year_month | hotel_price |
|---|---|---:|
| `KOROR` | `2026-07` | `182735` |
| `KOROR` | `2026-08` | `249703` |

