"""Redis connection helpers for the Geoapify cache loader."""

from __future__ import annotations

import os


def _runtime_defaults() -> dict[str, str]:
    runtime = os.getenv("APP_RUNTIME", "local").strip().lower()
    if runtime == "docker":
        return {"host": "redis", "port": "6379", "db": "0"}
    return {"host": "localhost", "port": "6379", "db": "0"}


def get_redis_client():
    """Create a Redis client configured for string values."""
    try:
        import redis
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "redis package is required to use the Geoapify cache loader."
        ) from exc

    defaults = _runtime_defaults()
    return redis.Redis(
        host=os.getenv("REDIS_HOST", defaults["host"]),
        port=int(os.getenv("REDIS_PORT", defaults["port"])),
        db=int(os.getenv("REDIS_DB", defaults["db"])),
        password=os.getenv("REDIS_PASSWORD") or None,
        decode_responses=True,
    )
