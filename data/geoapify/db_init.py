"""MySQL connection helpers for the Geoapify cache loader."""

from __future__ import annotations

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
    """Open a pymysql connection with runtime-aware defaults."""
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
        cursorclass=pymysql.cursors.DictCursor,
    )
