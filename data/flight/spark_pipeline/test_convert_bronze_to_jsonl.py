import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("convert_bronze_to_jsonl.py")
SPEC = importlib.util.spec_from_file_location("convert_bronze_to_jsonl", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


def test_default_source_paths_point_to_flight_bronze_directories():
    assert MODULE.DEFAULT_OUTDIR == MODULE.FLIGHT_ROOT / "normalized"
    assert MODULE.SOURCE_ROOTS["google_flight"] == MODULE.FLIGHT_ROOT / "google_flight" / "bronze_airticket"
    assert MODULE.SOURCE_ROOTS["trip_com"] == MODULE.FLIGHT_ROOT / "trip_com" / "bronze_airticket"
