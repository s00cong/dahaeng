import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("upload_trip_bronze.py")
SPEC = importlib.util.spec_from_file_location("upload_trip_bronze", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


def test_build_hdfs_target_directory_preserves_dt_and_hour():
    local_dir = Path("/workspace/data/flight/trip_com/bronze_airticket/dt=2026-03-19/hour=04")

    target = MODULE.build_hdfs_target_directory(local_dir, "/data/bronze/flight/trip_com")

    assert target == "/data/bronze/flight/trip_com/dt=2026-03-19/hour=04"


def test_find_latest_partition_dir_returns_latest_hour_for_latest_date(tmp_path):
    (tmp_path / "dt=2026-03-18" / "hour=09").mkdir(parents=True)
    (tmp_path / "dt=2026-03-19" / "hour=03").mkdir(parents=True)
    (tmp_path / "dt=2026-03-19" / "hour=11").mkdir(parents=True)

    latest = MODULE.find_latest_partition_dir(tmp_path)

    assert latest == tmp_path / "dt=2026-03-19" / "hour=11"
