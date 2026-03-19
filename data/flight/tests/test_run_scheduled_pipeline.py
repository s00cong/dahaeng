import json
import sys
from datetime import datetime
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parents[1]
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import run_scheduled_pipeline


def test_trip_com_runs_when_last_success_is_from_previous_day():
    now = datetime.fromisoformat("2026-03-18T03:00:00")
    last_success = datetime.fromisoformat("2026-03-17T03:00:00")

    assert run_scheduled_pipeline.should_run_source("trip_com", now, last_success) is True


def test_trip_com_skips_when_already_succeeded_today():
    now = datetime.fromisoformat("2026-03-18T03:00:00")
    last_success = datetime.fromisoformat("2026-03-18T00:30:00")

    assert run_scheduled_pipeline.should_run_source("trip_com", now, last_success) is False


def test_google_flight_skips_within_seven_days():
    now = datetime.fromisoformat("2026-03-18T03:00:00")
    last_success = datetime.fromisoformat("2026-03-12T03:00:01")

    assert run_scheduled_pipeline.should_run_source("google_flight", now, last_success) is False


def test_google_flight_runs_after_seven_days():
    now = datetime.fromisoformat("2026-03-18T03:00:00")
    last_success = datetime.fromisoformat("2026-03-11T02:59:59")

    assert run_scheduled_pipeline.should_run_source("google_flight", now, last_success) is True


def test_load_state_returns_empty_structure_when_file_missing(tmp_path):
    state = run_scheduled_pipeline.load_state(tmp_path / "missing.json")

    assert state == {"trip_com": {}, "google_flight": {}}


def test_save_state_writes_json(tmp_path):
    state_path = tmp_path / "pipeline_state.json"
    state = {"trip_com": {"last_success_at": "2026-03-18T03:00:00"}, "google_flight": {}}

    run_scheduled_pipeline.save_state(state_path, state)

    assert json.loads(state_path.read_text(encoding="utf-8")) == state


def test_build_runtime_config_reads_db_and_mongo_env(monkeypatch):
    monkeypatch.setenv("DB_URL", "jdbc:mysql://mysql:3306/dahaeng")
    monkeypatch.setenv("DB_USERNAME", "d206")
    monkeypatch.setenv("DB_PASSWORD", "secret")
    monkeypatch.setenv("MONGODB_URI", "mongodb://mongodb:27017/dahaeng")

    config = run_scheduled_pipeline.build_runtime_config()

    assert config["db_url"] == "jdbc:mysql://mysql:3306/dahaeng"
    assert config["db_username"] == "d206"
    assert config["db_password"] == "secret"
    assert config["mongo_uri"] == "mongodb://mongodb:27017/dahaeng"


def test_parse_mysql_connection_info_for_flight_summary_url():
    config = run_scheduled_pipeline.parse_mysql_jdbc_url("jdbc:mysql://mysql:3306/dahaeng")

    assert config == {"host": "mysql", "port": 3306, "database": "dahaeng"}


def test_plan_steps_for_trip_com_only_run_trip_normalize_and_both_local_etls():
    plan = run_scheduled_pipeline.build_execution_plan(
        due_sources={"trip_com"},
        python_executable="python",
        repo_root=Path("C:/repo/data/flight"),
        runtime_config={
            "db_url": "jdbc:mysql://mysql:3306/dahaeng",
            "db_username": "d206",
            "db_password": "secret",
            "mongo_uri": "mongodb://mongodb:27017/dahaeng",
        },
    )

    assert [step.name for step in plan] == [
        "trip_com_crawl",
        "trip_com_normalize",
        "trip_com_normalize_city_codes",
        "local_flight_summary_etl",
        "local_calendar_etl",
    ]


def test_build_execution_plan_uses_runtime_config_values():
    runtime_config = {
        "db_url": "jdbc:mysql://mysql:3306/dahaeng",
        "db_username": "d206",
        "db_password": "secret",
        "mongo_uri": "mongodb://mongodb:27017/dahaeng",
    }

    plan = run_scheduled_pipeline.build_execution_plan(
        due_sources={"trip_com"},
        python_executable="python",
        repo_root=Path("C:/repo/data/flight"),
        runtime_config=runtime_config,
    )

    summary_step = next(step for step in plan if step.name == "local_flight_summary_etl")
    calendar_step = next(step for step in plan if step.name == "local_calendar_etl")
    crawl_step = next(step for step in plan if step.name == "trip_com_crawl")

    assert "--db-url" in summary_step.command
    assert "jdbc:mysql://mysql:3306/dahaeng" in summary_step.command
    assert "d206" in summary_step.command
    assert "secret" in summary_step.command
    assert "mongodb://mongodb:27017/dahaeng" in calendar_step.command
    assert "--clear" not in calendar_step.command
    assert Path(crawl_step.command[1]) == Path("C:/repo/data/flight/trip_com/trip_scraper.py")
    assert Path(summary_step.command[1]) == Path("C:/repo/data/flight/spark_pipeline/local_flight_summary_etl.py")
    assert Path(calendar_step.command[1]) == Path("C:/repo/data/flight/spark_pipeline/local_calendar_etl.py")


def test_plan_steps_for_google_only_skip_calendar_etl():
    plan = run_scheduled_pipeline.build_execution_plan(
        due_sources={"google_flight"},
        python_executable="python",
        repo_root=Path("C:/repo/data/flight"),
        runtime_config={
            "db_url": "jdbc:mysql://mysql:3306/dahaeng",
            "db_username": "d206",
            "db_password": "secret",
            "mongo_uri": "mongodb://mongodb:27017/dahaeng",
        },
    )

    assert [step.name for step in plan] == [
        "google_flight_crawl",
        "google_flight_normalize",
        "local_flight_summary_etl",
    ]


def test_plan_steps_for_both_sources_deduplicate_shared_etl():
    plan = run_scheduled_pipeline.build_execution_plan(
        due_sources={"trip_com", "google_flight"},
        python_executable="python",
        repo_root=Path("C:/repo/data/flight"),
        runtime_config={
            "db_url": "jdbc:mysql://mysql:3306/dahaeng",
            "db_username": "d206",
            "db_password": "secret",
            "mongo_uri": "mongodb://mongodb:27017/dahaeng",
        },
    )

    assert [step.name for step in plan] == [
        "trip_com_crawl",
        "google_flight_crawl",
        "trip_com_normalize",
        "google_flight_normalize",
        "trip_com_normalize_city_codes",
        "local_flight_summary_etl",
        "local_calendar_etl",
    ]


def test_run_plan_stops_after_first_failed_step():
    step = run_scheduled_pipeline.Step(name="trip_com_crawl", command=["python", "trip_scraper.py"])
    calls = []

    def fake_runner(current_step):
        calls.append(current_step.name)
        return False

    result = run_scheduled_pipeline.run_plan([step], fake_runner)

    assert result.success is False
    assert result.succeeded_sources == set()
    assert result.failed_step == "trip_com_crawl"
    assert calls == ["trip_com_crawl"]


def test_run_plan_marks_all_sources_successful_when_every_step_passes():
    plan = [
        run_scheduled_pipeline.Step(name="trip_com_crawl", command=["python"], sources={"trip_com"}),
        run_scheduled_pipeline.Step(name="google_flight_crawl", command=["python"], sources={"google_flight"}),
        run_scheduled_pipeline.Step(
            name="local_flight_summary_etl",
            command=["python"],
            sources={"trip_com", "google_flight"},
        ),
        run_scheduled_pipeline.Step(name="local_calendar_etl", command=["python"], sources={"trip_com"}),
    ]

    result = run_scheduled_pipeline.run_plan(plan, lambda current_step: True)

    assert result.success is True
    assert result.succeeded_sources == {"trip_com", "google_flight"}
    assert result.failed_step is None


def test_run_plan_preserves_completed_source_success_when_later_source_specific_step_fails():
    plan = [
        run_scheduled_pipeline.Step(name="google_flight_crawl", command=["python"], sources={"google_flight"}),
        run_scheduled_pipeline.Step(
            name="local_flight_summary_etl",
            command=["python"],
            sources={"trip_com", "google_flight"},
        ),
        run_scheduled_pipeline.Step(name="local_calendar_etl", command=["python"], sources={"trip_com"}),
    ]

    def fake_runner(current_step):
        return current_step.name != "local_calendar_etl"

    result = run_scheduled_pipeline.run_plan(plan, fake_runner)

    assert result.success is False
    assert result.succeeded_sources == {"google_flight"}
    assert result.failed_step == "local_calendar_etl"


def test_parse_args_accepts_dry_run_state_file_force_source_and_now(monkeypatch):
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "run_scheduled_pipeline.py",
            "--dry-run",
            "--state-file",
            "state.json",
            "--force-source",
            "trip_com",
            "--now",
            "2026-03-18T03:00:00",
        ],
    )

    args = run_scheduled_pipeline.parse_args()

    assert args.dry_run is True
    assert args.state_file == "state.json"
    assert args.force_source == ["trip_com"]
    assert args.now == "2026-03-18T03:00:00"


def test_select_due_sources_respects_force_source_over_schedule():
    state = {
        "trip_com": {"last_success_at": "2026-03-18T01:00:00"},
        "google_flight": {"last_success_at": "2026-03-17T01:00:00"},
    }
    now = datetime.fromisoformat("2026-03-18T03:00:00")

    due_sources = run_scheduled_pipeline.select_due_sources(
        state=state,
        now=now,
        force_sources={"google_flight"},
    )

    assert due_sources == {"google_flight"}


def test_apply_success_updates_only_sources_that_completed():
    state = {"trip_com": {}, "google_flight": {}}
    now = datetime.fromisoformat("2026-03-18T03:00:00")

    updated = run_scheduled_pipeline.apply_success_times(state, {"trip_com"}, now)

    assert updated["trip_com"]["last_success_at"] == "2026-03-18T03:00:00"
    assert "last_success_at" not in updated["google_flight"]


def test_default_state_file_path_is_under_data_runtime():
    path = run_scheduled_pipeline.default_state_path(repo_root=Path("C:/repo/data/flight"))

    assert path == Path("C:/repo/data/flight/.runtime/pipeline_state.json")
