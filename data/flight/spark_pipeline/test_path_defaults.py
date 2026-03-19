import sys
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import local_flight_summary_etl


def test_local_flight_summary_default_paths_point_to_flight_directory():
    assert local_flight_summary_etl.DEFAULT_GOOGLE_PATH == local_flight_summary_etl.FLIGHT_ROOT / "normalized" / "google_flight.jsonl"
    assert local_flight_summary_etl.DEFAULT_TRIP_PATH == local_flight_summary_etl.FLIGHT_ROOT / "normalized" / "trip_com.jsonl"
    assert local_flight_summary_etl.DEFAULT_MAPPING_PATH == local_flight_summary_etl.FLIGHT_ROOT / "trip_com" / "city_airport_mapping.json"
