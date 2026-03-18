import importlib.util
import sys
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("run_scheduled_pipeline.py")
SPEC = importlib.util.spec_from_file_location("run_scheduled_pipeline", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def test_run_plan_with_retry_retries_only_failed_step_and_following_steps():
    plan = [
        MODULE.Step(name="trip_com_crawl", command=["crawl"], sources={"trip_com"}),
        MODULE.Step(name="trip_com_normalize", command=["normalize"], sources={"trip_com"}),
        MODULE.Step(name="local_flight_summary_etl", command=["summary"], sources={"trip_com"}),
        MODULE.Step(name="local_calendar_etl", command=["calendar"], sources={"trip_com"}),
    ]
    attempts = {
        "trip_com_crawl": 0,
        "trip_com_normalize": 0,
        "local_flight_summary_etl": 0,
        "local_calendar_etl": 0,
    }

    def runner(step: MODULE.Step) -> bool:
        attempts[step.name] += 1
        if step.name == "trip_com_normalize" and attempts[step.name] == 1:
            return False
        return True

    result = MODULE.run_plan_with_retry(plan, runner)

    assert result.success is True
    assert result.retry_performed is True
    assert result.failed_step is None
    assert attempts == {
        "trip_com_crawl": 1,
        "trip_com_normalize": 2,
        "local_flight_summary_etl": 1,
        "local_calendar_etl": 1,
    }
