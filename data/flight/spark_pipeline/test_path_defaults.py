import sys
from pathlib import Path
import re


MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import local_flight_summary_etl


def test_local_flight_summary_default_paths_point_to_flight_directory():
    assert local_flight_summary_etl.DEFAULT_GOOGLE_PATH == local_flight_summary_etl.FLIGHT_ROOT / "normalized" / "google_flight.jsonl"
    assert local_flight_summary_etl.DEFAULT_TRIP_PATH == local_flight_summary_etl.FLIGHT_ROOT / "normalized" / "trip_com.jsonl"
    assert local_flight_summary_etl.DEFAULT_MAPPING_PATH == local_flight_summary_etl.FLIGHT_ROOT / "trip_com" / "city_airport_mapping.json"


def test_bronze_to_silver_flight_defaults_use_flight_silver_directory():
    source = (MODULE_DIR / "bronze_to_silver_flight.py").read_text(encoding="utf-8")

    assert 'default="/workspace/data/flight/normalized/google_flight.jsonl"' in source
    assert 'default="hdfs://namenode:9000/data/bronze/flight/trip_com"' in source
    assert re.search(r'default="hdfs://namenode:9000/data/silver/flight/flight_summary"', source)
    assert '.partitionBy("city_id", "year_month")' in source


def test_bronze_to_silver_calendar_defaults_use_hdfs_trip_paths():
    source = (MODULE_DIR / "bronze_to_silver_calendar.py").read_text(encoding="utf-8")

    assert 'default="hdfs://namenode:9000/data/bronze/flight/trip_com"' in source
    assert 'default="hdfs://namenode:9000/data/silver/flight/trip_com_daily_prices"' in source
    assert '.partitionBy("city_id", "year_month")' in source
