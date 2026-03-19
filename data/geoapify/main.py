"""Batch loader that caches Geoapify place responses in Redis."""

from __future__ import annotations

import json
import os

try:
    from data.geoapify.client import fetch_places
    from data.geoapify.db_init import get_db_connection
    from data.geoapify.redis_init import get_redis_client
    from data.geoapify.repository import select_active_cities_with_coordinates
except ModuleNotFoundError:
    from client import fetch_places
    from db_init import get_db_connection
    from redis_init import get_redis_client
    from repository import select_active_cities_with_coordinates


DEFAULT_CATEGORY = "tourism.sights"
DEFAULT_RADIUS_METERS = 10000
DEFAULT_LIMIT = 20


def build_cache_key(city_id, category=DEFAULT_CATEGORY):
    """Build the Redis key Spring Boot will read later."""
    return f"geoapify:places:{category}:city:{city_id}"


def store_response(redis_client, city_id, payload, category=DEFAULT_CATEGORY):
    """Store the raw Geoapify response JSON with Redis SET."""
    key = build_cache_key(city_id, category=category)
    raw_json = json.dumps(payload, ensure_ascii=False)
    redis_client.set(key, raw_json)
    return key


def run(
    *,
    db_connection,
    redis_client,
    city_fetcher=select_active_cities_with_coordinates,
    places_fetcher=fetch_places,
    category=DEFAULT_CATEGORY,
    radius_meters=DEFAULT_RADIUS_METERS,
    limit=DEFAULT_LIMIT,
):
    """Fetch place responses for all eligible cities and cache them in Redis."""
    cities = city_fetcher(db_connection)
    summary = {
        "processed": 0,
        "stored": 0,
        "failed": 0,
    }

    for city in cities:
        city_id = city["id"]
        country_id = city.get("country_id")
        city_name = city.get("city_name") or ""
        summary["processed"] += 1
        try:
            payload = places_fetcher(
                lon=city["lon"],
                lat=city["lat"],
                category=category,
                radius_meters=radius_meters,
                limit=limit,
            )
            key = store_response(redis_client, city_id, payload, category=category)
            feature_count = len(payload.get("features", []))
            summary["stored"] += 1
            print(
                "SUCCESS "
                f"country_id={country_id} city_id={city_id} "
                f"city_name={city_name} key={key} features={feature_count}"
            )
        except Exception as exc:  # pragma: no cover - exercised through runtime failures
            summary["failed"] += 1
            print(
                "FAIL "
                f"country_id={country_id} city_id={city_id} "
                f"city_name={city_name} error={exc}"
            )

    return summary


def main():
    """Run the Geoapify cache batch with real MySQL and Redis connections."""
    category = os.getenv("GEOAPIFY_CATEGORY", DEFAULT_CATEGORY)
    radius_meters = int(os.getenv("GEOAPIFY_RADIUS_METERS", str(DEFAULT_RADIUS_METERS)))
    limit = int(os.getenv("GEOAPIFY_LIMIT", str(DEFAULT_LIMIT)))

    db_connection = get_db_connection()
    redis_client = get_redis_client()
    try:
        summary = run(
            db_connection=db_connection,
            redis_client=redis_client,
            category=category,
            radius_meters=radius_meters,
            limit=limit,
        )
        print(
            "SUMMARY "
            f"processed={summary['processed']} stored={summary['stored']} failed={summary['failed']}"
        )
    finally:
        db_connection.close()
        close_method = getattr(redis_client, "close", None)
        if callable(close_method):
            close_method()


if __name__ == "__main__":
    main()
