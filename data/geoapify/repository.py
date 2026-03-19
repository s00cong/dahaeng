"""Database queries for the Geoapify cache loader."""

from __future__ import annotations


def select_active_cities_with_coordinates(conn):
    """Return city rows that can be used to call Geoapify."""
    query = """
        SELECT
            id,
            country_id,
            city_name,
            lat,
            lon
        FROM city
        WHERE (is_deleted = FALSE OR is_deleted IS NULL)
          AND lat IS NOT NULL
          AND lon IS NOT NULL
        ORDER BY id ASC
    """
    with conn.cursor() as cursor:
        cursor.execute(query)
        return list(cursor.fetchall())
