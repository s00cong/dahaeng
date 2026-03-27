"""Connection helpers for the living cost pipeline."""

import os
import pymysql


def _runtime_defaults() -> dict[str, str]:
    runtime = os.getenv("APP_RUNTIME", "local").strip().lower()
    if runtime == "docker":
        return {
            "host": "mysql",
            "port": "3306",
            "user": "d206",
            "password": "d206-1111",
            "database": "dahaeng",
        }
    return {
        "host": "localhost",
        "port": "8900",
        "user": "d206",
        "password": "d206-1111",
        "database": "dahaeng",
    }


def get_db_connection():
    """Open DB connection with runtime-aware defaults (local/docker)."""
    defaults = _runtime_defaults()
    db_user = os.getenv("DB_USER") or os.getenv("DB_USERNAME") or defaults["user"]
    db_name = os.getenv("DB_NAME") or os.getenv("MYSQL_DATABASE") or defaults["database"]
    return pymysql.connect(
        host=os.getenv("DB_HOST", defaults["host"]),
        user=db_user,
        password=os.getenv("DB_PASSWORD", defaults["password"]),
        database=db_name,
        charset="utf8mb4",
        autocommit=False,
        port=int(os.getenv("DB_PORT", defaults["port"])),
    )


def create_tables_if_not_exists(conn=None):
    """Kept for backward compatibility; schema creation is no longer handled here."""
    return None


if __name__ == "__main__":
    print("data/livingcost/db_init.py only provides DB connection helpers.")
