from __future__ import annotations

import argparse
import copy
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse


SUPPORTED_SOURCES = ("trip_com", "google_flight")
DEFAULT_STATE = {source: {} for source in SUPPORTED_SOURCES}


@dataclass(frozen=True)
class Step:
    name: str
    command: list[str]
    sources: set[str] = field(default_factory=set)
    env_overrides: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class RunResult:
    success: bool
    succeeded_sources: set[str]
    failed_step: str | None = None
    retry_performed: bool = False


def repo_root() -> Path:
    return Path(__file__).resolve().parent


def default_state_path(repo_root: Path | None = None) -> Path:
    root = repo_root or globals()["repo_root"]()
    return root / ".runtime" / "pipeline_state.json"


def parse_args():
    parser = argparse.ArgumentParser(description="Run the local/cron data pipeline with per-source schedule rules.")
    parser.add_argument("--dry-run", action="store_true", help="Print selected steps without running them.")
    parser.add_argument("--state-file", help="Override runtime state file path.")
    parser.add_argument(
        "--force-source",
        action="append",
        choices=SUPPORTED_SOURCES,
        default=[],
        help="Run the given source regardless of its schedule. Can be passed multiple times.",
    )
    parser.add_argument("--now", help="ISO datetime override for local verification.")
    return parser.parse_args()


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


def parse_mysql_jdbc_url(db_url: str) -> dict[str, int | str]:
    normalized_url = db_url.removeprefix("jdbc:")
    parsed = urlparse(normalized_url)

    if parsed.scheme != "mysql":
        raise ValueError(f"Unsupported DB URL: {db_url}")

    database = parsed.path.lstrip("/")
    if not parsed.hostname or not parsed.port or not database:
        raise ValueError(f"Incomplete DB URL: {db_url}")

    return {
        "host": parsed.hostname,
        "port": parsed.port,
        "database": database,
    }


def build_runtime_config() -> dict[str, str]:
    required = {
        "DB_URL": os.getenv("DB_URL"),
        "DB_USERNAME": os.getenv("DB_USERNAME"),
        "DB_PASSWORD": os.getenv("DB_PASSWORD"),
        "MONGODB_URI": os.getenv("MONGODB_URI"),
        "HDFS_NAMENODE_URI": os.getenv("HDFS_NAMENODE_URI"),
        "HDFS_TRIP_BRONZE_ROOT": os.getenv("HDFS_TRIP_BRONZE_ROOT"),
        "HDFS_TRIP_SILVER_ROOT": os.getenv("HDFS_TRIP_SILVER_ROOT"),
        "HDFS_FLIGHT_SUMMARY_SILVER_ROOT": os.getenv("HDFS_FLIGHT_SUMMARY_SILVER_ROOT"),
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(f"Missing required environment variables for scheduled pipeline: {joined}")

    return {
        "db_url": required["DB_URL"],
        "db_username": required["DB_USERNAME"],
        "db_password": required["DB_PASSWORD"],
        "mongo_uri": required["MONGODB_URI"],
        "hdfs_namenode_uri": required["HDFS_NAMENODE_URI"],
        "hdfs_trip_bronze_root": required["HDFS_TRIP_BRONZE_ROOT"],
        "hdfs_trip_silver_root": required["HDFS_TRIP_SILVER_ROOT"],
        "hdfs_flight_summary_silver_root": required["HDFS_FLIGHT_SUMMARY_SILVER_ROOT"],
    }


def build_hdfs_uri(hdfs_namenode_uri: str, hdfs_root: str) -> str:
    return f"{hdfs_namenode_uri.rstrip('/')}/{hdfs_root.lstrip('/')}"


def should_run_source(source: str, now: datetime, last_success: datetime | None) -> bool:
    if source == "google_flight":
        # [서버 봇 차단 이슈] 서버 헤드리스 환경에서 ICN 출발지 입력창이 막히는 문제가 있어
        # 당분간 자동 스케줄링(cron) 대상에서 제외합니다. 로컬에서 수동으로만 수집합니다.
        return False

    if last_success is None:
        return True

    if source == "trip_com":
        return last_success.date() < now.date()

    raise ValueError(f"Unsupported source: {source}")


def load_state(path: Path) -> dict:
    if not path.exists():
        return copy.deepcopy(DEFAULT_STATE)

    data = json.loads(path.read_text(encoding="utf-8"))
    state = copy.deepcopy(DEFAULT_STATE)
    for source in SUPPORTED_SOURCES:
        if isinstance(data.get(source), dict):
            state[source] = dict(data[source])
    return state


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    temp_path.replace(path)


def select_due_sources(state: dict, now: datetime, force_sources: set[str] | None = None) -> set[str]:
    if force_sources:
        return set(force_sources)

    due_sources: set[str] = set()
    for source in SUPPORTED_SOURCES:
        last_success = parse_iso_datetime(state.get(source, {}).get("last_success_at"))
        if should_run_source(source, now, last_success):
            due_sources.add(source)
    return due_sources


def build_execution_plan(
    due_sources: set[str],
    python_executable: str,
    repo_root: Path,
    runtime_config: dict[str, str] | None = None,
) -> list[Step]:
    config = runtime_config or build_runtime_config()
    data_dir = repo_root
    normalized_dir = data_dir / "normalized"
    plan: list[Step] = []
    trip_hdfs_bronze_uri = build_hdfs_uri(config["hdfs_namenode_uri"], config["hdfs_trip_bronze_root"])
    trip_hdfs_silver_uri = build_hdfs_uri(config["hdfs_namenode_uri"], config["hdfs_trip_silver_root"])
    flight_summary_silver_uri = build_hdfs_uri(
        config["hdfs_namenode_uri"],
        config["hdfs_flight_summary_silver_root"],
    )

    if "trip_com" in due_sources:
        plan.append(
            Step(
                name="trip_com_crawl",
                command=[python_executable, str(data_dir / "trip_com" / "trip_scraper.py")],
                sources={"trip_com"},
            )
        )

    if "google_flight" in due_sources:
        plan.append(
            Step(
                name="google_flight_crawl",
                command=[python_executable, str(data_dir / "google_flight" / "google_flight_scraper.py")],
                sources={"google_flight"},
                env_overrides={"IGNORE_CHECKPOINT": "1"},
            )
        )

    if "trip_com" in due_sources:
        plan.append(
            Step(
                name="trip_com_hdfs_upload",
                command=[
                    python_executable,
                    str(data_dir / "hdfs" / "upload_trip_bronze.py"),
                    "--local-bronze-root",
                    str(data_dir / "trip_com" / "bronze_airticket"),
                    "--hdfs-root",
                    config["hdfs_trip_bronze_root"],
                    "--hdfs-uri",
                    config["hdfs_namenode_uri"],
                    "--datanode-host",
                    "datanode",
                ],
                sources={"trip_com"},
            )
        )

    if "google_flight" in due_sources:
        plan.append(
            Step(
                name="google_flight_normalize",
                command=[
                    python_executable,
                    str(data_dir / "spark_pipeline" / "convert_bronze_to_jsonl.py"),
                    "--source",
                    "google_flight",
                    "--outdir",
                    str(normalized_dir),
                ],
                sources={"google_flight"},
            )
        )

    if "trip_com" in due_sources:
        plan.append(
            Step(
                name="trip_com_spark_calendar_etl",
                command=[
                    python_executable,
                    str(data_dir / "spark_pipeline" / "bronze_to_silver_calendar.py"),
                    "--bronze-path",
                    trip_hdfs_bronze_uri,
                    "--silver-path",
                    trip_hdfs_silver_uri,
                    "--db-url",
                    config["db_url"],
                    "--db-user",
                    config["db_username"],
                    "--db-password",
                    config["db_password"],
                    "--mongo-uri",
                    config["mongo_uri"],
                ],
                sources={"trip_com"},
            )
        )

    if due_sources:
        plan.append(
            Step(
                name="flight_summary_spark_etl",
                command=[
                    python_executable,
                    str(data_dir / "spark_pipeline" / "bronze_to_silver_flight.py"),
                    "--google-path",
                    str(normalized_dir / "google_flight.jsonl"),
                    "--tripcom-path",
                    trip_hdfs_bronze_uri,
                    "--silver-path",
                    flight_summary_silver_uri,
                    "--db-url",
                    config["db_url"],
                    "--db-user",
                    config["db_username"],
                    "--db-password",
                    config["db_password"],
                ],
                sources=set(due_sources),
            )
        )

    return plan


def run_plan(plan: list[Step], runner: Callable[[Step], bool]) -> RunResult:
    active_sources = {source for step in plan for source in step.sources}
    required_steps = {
        source: {step.name for step in plan if source in step.sources}
        for source in active_sources
    }
    completed_steps: set[str] = set()

    for step in plan:
        if not runner(step):
            succeeded_sources = {
                source for source, names in required_steps.items() if names.issubset(completed_steps)
            }
            return RunResult(
                success=False,
                succeeded_sources=succeeded_sources,
                failed_step=step.name,
                retry_performed=False,
            )
        completed_steps.add(step.name)

    succeeded_sources = {
        source for source, names in required_steps.items() if names.issubset(completed_steps)
    }
    return RunResult(
        success=True,
        succeeded_sources=succeeded_sources,
        failed_step=None,
        retry_performed=False,
    )


def run_plan_with_retry(plan: list[Step], runner: Callable[[Step], bool]) -> RunResult:
    initial_result = run_plan(plan, runner)
    if initial_result.success:
        return initial_result

    failed_index = next(
        (index for index, step in enumerate(plan) if step.name == initial_result.failed_step),
        None,
    )
    if failed_index is None:
        return initial_result

    retry_plan = plan[failed_index:]
    retry_result = run_plan(retry_plan, runner)
    if retry_result.success:
        return RunResult(
            success=True,
            succeeded_sources=initial_result.succeeded_sources | retry_result.succeeded_sources,
            failed_step=None,
            retry_performed=True,
        )

    return RunResult(
        success=False,
        succeeded_sources=initial_result.succeeded_sources | retry_result.succeeded_sources,
        failed_step=retry_result.failed_step,
        retry_performed=True,
    )


def apply_success_times(state: dict, succeeded_sources: set[str], now: datetime) -> dict:
    updated = copy.deepcopy(state)
    for source in SUPPORTED_SOURCES:
        updated.setdefault(source, {})
        if source in succeeded_sources:
            updated[source]["last_success_at"] = now.isoformat(timespec="seconds")
    return updated


def run_step(step: Step) -> bool:
    print(f"[RUN] {step.name}")
    print("      " + " ".join(step.command))
    env = os.environ.copy()
    env.update(step.env_overrides)
    completed = subprocess.run(step.command, check=False, env=env)
    return completed.returncode == 0


def dry_run_step(step: Step) -> bool:
    print(f"[DRY-RUN] {step.name}")
    print("          " + " ".join(step.command))
    if step.env_overrides:
        print("          env: " + " ".join(f"{key}={value}" for key, value in step.env_overrides.items()))
    return True


def main() -> int:
    args = parse_args()
    current_repo_root = repo_root()
    state_path = Path(args.state_file) if args.state_file else default_state_path(current_repo_root)
    now = parse_iso_datetime(args.now) or datetime.now()

    state = load_state(state_path)
    due_sources = select_due_sources(
        state=state,
        now=now,
        force_sources=set(args.force_source),
    )

    if not due_sources:
        print("[SKIP] No sources are due.")
        return 0

    print(f"[INFO] Due sources: {', '.join(sorted(due_sources))}")
    plan = build_execution_plan(
        due_sources=due_sources,
        python_executable=sys.executable,
        repo_root=current_repo_root,
        runtime_config=build_runtime_config(),
    )

    runner = dry_run_step if args.dry_run else run_step
    result = run_plan_with_retry(plan, runner)

    if args.dry_run:
        return 0 if result.success else 1

    if result.succeeded_sources:
        updated_state = apply_success_times(state, result.succeeded_sources, now)
        save_state(state_path, updated_state)
        print(f"[INFO] Updated state for: {', '.join(sorted(result.succeeded_sources))}")

    if result.retry_performed:
        print("[INFO] Retry was performed for failed pipeline steps.")

    if not result.success:
        print(f"[FAIL] Step failed: {result.failed_step}")
        return 1

    print("[DONE] Pipeline completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
