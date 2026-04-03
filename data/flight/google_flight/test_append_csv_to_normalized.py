import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("append_csv_to_normalized.py")
SPEC = importlib.util.spec_from_file_location("append_csv_to_normalized", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


DIRECT = "\uc9c1\ud56d"
ONE_STOP = "\uacbd\uc720 1\ud68c"
CITY_NAME = "\ub374\ub9ac"
EIGHT_HOURS_FIVE_MIN = "8\uc2dc\uac04 5\ubd84"
FOURTEEN_HOURS_TWENTY_MIN = "14\uc2dc\uac04 20\ubd84"
FIFTEEN_HOURS_TWENTY_MIN = "15\uc2dc\uac04 20\ubd84"
SIX_MONTH = "6\uc6d4"


class AppendCsvToNormalizedTest(unittest.TestCase):
    def test_rebuild_normalized_from_bronze_recomputes_min_duration_and_matching_stops(self):
        bronze_record = {
            "dataset": "airticket",
            "schema_version": 3,
            "source": "google_flights",
            "ingest_time": "2026-03-10T14:00:07",
            "event_time": "2026-06-01",
            "entity": {
                "city_id": "DELHI",
                "city_name_kr": CITY_NAME,
                "origin_airport": "ICN",
                "target_month": SIX_MONTH,
                "year_month": "2026-06",
                "route_type": "explore_monthly_snapshot",
            },
            "payload": {
                "trip_length_days": 7,
                "trip_dates": "N/A",
                "hotel_price": 2922,
                "flight_1_stops_text": ONE_STOP,
                "flight_1_duration_text": FIFTEEN_HOURS_TWENTY_MIN,
                "flight_2_stops_text": DIRECT,
                "flight_2_duration_text": EIGHT_HOURS_FIVE_MIN,
                "flight_3_stops_text": ONE_STOP,
                "flight_3_duration_text": FOURTEEN_HOURS_TWENTY_MIN,
                "typical_stops_count": 1,
                "typical_stops_text": ONE_STOP,
                "avg_duration_minutes": 752,
                "avg_duration_text": "12\uc2dc\uac04 32\ubd84",
                "peak_season_months_raw": "N/A",
                "peak_season_months_list": "N/A",
                "off_season_months_raw": "N/A",
                "off_season_months_list": "N/A",
                "collected_at": "2026-03-10 16:37:59",
            },
        }

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            bronze_root = tmp_path / "bronze"
            normalized_path = tmp_path / "google_flight.jsonl"
            bronze_path = bronze_root / "dt=2026-03-10" / "hour=14" / "all_cities.jsonl"
            bronze_path.parent.mkdir(parents=True, exist_ok=True)
            bronze_path.write_text(json.dumps(bronze_record, ensure_ascii=False) + "\n", encoding="utf-8")

            stats = MODULE.rebuild_normalized_from_bronze(
                normalized_path=normalized_path,
                bronze_root=bronze_root,
            )
            written_record = MODULE.load_jsonl(normalized_path)[0]

        self.assertEqual(stats["bronze_records"], 1)
        self.assertEqual(stats["rebuilt_records"], 1)
        self.assertEqual(written_record["payload"]["min_duration_minutes"], 485)
        self.assertEqual(written_record["payload"]["min_duration_text"], EIGHT_HOURS_FIVE_MIN)
        self.assertEqual(written_record["payload"]["typical_stops_count"], 0)
        self.assertEqual(written_record["payload"]["typical_stops_text"], DIRECT)
        self.assertNotIn("avg_duration_minutes", written_record["payload"])
        self.assertNotIn("avg_duration_text", written_record["payload"])

    def test_compute_min_duration_picks_shortest_valid_duration(self):
        minutes, text, is_missing = MODULE.compute_min_duration(
            [FIFTEEN_HOURS_TWENTY_MIN, EIGHT_HOURS_FIVE_MIN, FOURTEEN_HOURS_TWENTY_MIN]
        )

        self.assertEqual(minutes, 485)
        self.assertEqual(text, EIGHT_HOURS_FIVE_MIN)
        self.assertFalse(is_missing)

    def test_select_flight_by_min_duration_uses_matching_stops(self):
        selected = MODULE.select_flight_by_min_duration(
            [
                {"duration_text": FIFTEEN_HOURS_TWENTY_MIN, "stops_text": ONE_STOP},
                {"duration_text": EIGHT_HOURS_FIVE_MIN, "stops_text": DIRECT},
                {"duration_text": FOURTEEN_HOURS_TWENTY_MIN, "stops_text": ONE_STOP},
            ]
        )

        self.assertEqual(selected["duration_minutes"], 485)
        self.assertEqual(selected["duration_text"], EIGHT_HOURS_FIVE_MIN)
        self.assertEqual(selected["stops_count"], 0)
        self.assertEqual(selected["stops_text"], DIRECT)

    def test_select_flight_by_min_duration_breaks_ties_by_first_flight(self):
        selected = MODULE.select_flight_by_min_duration(
            [
                {"duration_text": EIGHT_HOURS_FIVE_MIN, "stops_text": ONE_STOP},
                {"duration_text": EIGHT_HOURS_FIVE_MIN, "stops_text": DIRECT},
            ]
        )

        self.assertEqual(selected["stops_count"], 1)
        self.assertEqual(selected["stops_text"], ONE_STOP)

    def test_convert_csv_row_to_record_uses_min_duration_fields_and_matching_stops(self):
        row = {
            "Timestamp": "2026-03-10 16:37:59",
            "Month": SIX_MONTH,
            "Dates": "N/A",
            "Searched As": CITY_NAME,
            "Destination": "DEL",
            "Hotel Price / Night": "\u20a92,922",
            "Flight 1 Stops": ONE_STOP,
            "Flight 1 Duration": FIFTEEN_HOURS_TWENTY_MIN,
            "Flight 2 Stops": DIRECT,
            "Flight 2 Duration": EIGHT_HOURS_FIVE_MIN,
            "Flight 3 Stops": ONE_STOP,
            "Flight 3 Duration": FOURTEEN_HOURS_TWENTY_MIN,
            "Peak Season Months (Raw)": "N/A",
            "Peak Season Months (List)": "N/A",
            "Off Season Months (Raw)": "N/A",
            "Off Season Months (List)": "N/A",
        }
        city_lookup = {CITY_NAME: {"city_code": "DELHI", "city_name_kr": CITY_NAME}}

        record, missing_duration_alerts = MODULE.convert_csv_row_to_record(row, city_lookup)

        self.assertEqual(record["payload"]["min_duration_minutes"], 485)
        self.assertEqual(record["payload"]["min_duration_text"], EIGHT_HOURS_FIVE_MIN)
        self.assertEqual(record["payload"]["typical_stops_count"], 0)
        self.assertEqual(record["payload"]["typical_stops_text"], DIRECT)
        self.assertNotIn("avg_duration_minutes", record["payload"])
        self.assertNotIn("avg_duration_text", record["payload"])
        self.assertEqual(missing_duration_alerts, [])

    def test_append_csv_snapshots_uses_zero_and_unknown_stops_when_all_durations_missing(self):
        mapping = [
            {
                "city_code": "DELHI",
                "city_name_kr": CITY_NAME,
                "routes": [{"airport": "DEL"}],
            }
        ]
        csv_rows = [
            {
                "Timestamp": "2026-03-10 16:37:59",
                "Month": SIX_MONTH,
                "Dates": "N/A",
                "Searched As": CITY_NAME,
                "Destination": "DEL",
                "Hotel Price / Night": "\u20a92,922",
                "Flight 1 Stops": ONE_STOP,
                "Flight 1 Duration": "N/A",
                "Flight 2 Stops": DIRECT,
                "Flight 2 Duration": "",
                "Flight 3 Stops": ONE_STOP,
                "Flight 3 Duration": "N/A",
                "Peak Season Months (Raw)": "N/A",
                "Peak Season Months (List)": "N/A",
                "Off Season Months (Raw)": "N/A",
                "Off Season Months (List)": "N/A",
            }
        ]

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            mapping_path = tmp_path / "mapping.json"
            normalized_path = tmp_path / "google_flight.jsonl"
            csv_path = tmp_path / "explore_prices_live_2026_test.csv"

            mapping_path.write_text(json.dumps(mapping, ensure_ascii=False), encoding="utf-8")

            with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
                handle.write(",".join(csv_rows[0].keys()) + "\n")
                handle.write(",".join(f'"{value}"' for value in csv_rows[0].values()) + "\n")

            stats = MODULE.append_csv_snapshots(
                normalized_path=normalized_path,
                mapping_path=mapping_path,
                csv_paths=[csv_path],
            )
            written_record = MODULE.load_jsonl(normalized_path)[0]

        self.assertEqual(written_record["payload"]["min_duration_minutes"], 0)
        self.assertEqual(written_record["payload"]["min_duration_text"], "0\ubd84")
        self.assertEqual(written_record["payload"]["typical_stops_count"], -1)
        self.assertEqual(written_record["payload"]["typical_stops_text"], "N/A")
        self.assertEqual(
            stats["missing_duration_alerts"],
            [
                {
                    "city_code": "DELHI",
                    "year_month": "2026-06",
                    "metric": "min_duration_minutes",
                }
            ],
        )
