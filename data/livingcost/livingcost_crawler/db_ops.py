"""Database operations for livingcost crawler."""

from typing import Any, Dict, List, Optional, Tuple

from .constants import (
    CITY_COST_REQUIRED_DEFAULT_ZERO,
    ITEM_TO_COLUMN,
    TABLE_CITY,
    TABLE_CITY_COST,
    TABLE_COUNTRY,
    TABLE_COUNTRY_COST,
)


def build_price_column_values(payload: Dict[str, Any]) -> Dict[str, Optional[float]]:
    values = {
        "daily_budget": None,
        "without_rent": None,
        "food": None,
        "transport": None,
        "monthly_salary_after_tax": None,
        "population": None,
        "lunch_menu": None,
        "dinner_in_a_resturant_for_2": None,
        "fast_food_meal": None,
        "beer_in_a_pub": None,
        "cappuccino": None,
        "coke_pepsi": None,
        "local_transport_ticket": None,
        "monthly_ticket_local_transport": None,
        "taxi_ride": None,
        "gas_petrol": None,
        "milk": None,
        "bread": None,
        "rice": None,
        "egg": None,
        "chicken": None,
        "steak": None,
        "apple": None,
        "banana": None,
        "orange": None,
        "tomato": None,
        "potato": None,
        "onion": None,
        "water": None,
        "coke": None,
        "wine": None,
        "beer": None,
        "cigarette": None,
        "cold_medicine": None,
        "shampoo": None,
        "toilet_paper": None,
        "toothpaste": None,
        "gym_month": None,
        "cinema_ticket": None,
        "haircut": None,
        "brand_jeans": None,
        "brand_sneakers": None,
    }

    if "data" in payload and isinstance(payload["data"], dict):
        data = payload["data"]
        overview = payload.get("overview", {}) or {}
    else:
        data = payload
        overview = {}

    values["without_rent"] = overview.get("without_rent")
    values["food"] = overview.get("food")
    values["transport"] = overview.get("transport")
    values["monthly_salary_after_tax"] = overview.get("monthly_salary_after_tax")
    values["population"] = overview.get("population")

    for items in data.values():
        for item in items:
            column = ITEM_TO_COLUMN.get(item["item"])
            if column:
                values[column] = item.get("usd")

    lunch_menu = values.get("lunch_menu") or 0.0
    cappuccino = values.get("cappuccino") or 0.0
    coke_pepsi = values.get("coke_pepsi") or 0.0
    local_transport_ticket = values.get("local_transport_ticket") or 0.0
    dinner_for_2 = values.get("dinner_in_a_resturant_for_2") or 0.0
    values["daily_budget"] = (
        (0.5 * lunch_menu)
        + (1.0 * lunch_menu)
        + (dinner_for_2 / 2.0)
        + (1.0 * cappuccino)
        + (1.0 * coke_pepsi)
        + (2.0 * local_transport_ticket)
    )

    for required in CITY_COST_REQUIRED_DEFAULT_ZERO:
        if values[required] is None:
            values[required] = 0.0

    return values


def seed_locations_if_missing(
    conn,
    countries_cities: Dict[str, List[str]],
) -> Tuple[Dict[str, int], Dict[Tuple[str, str], int]]:
    country_ids: Dict[str, int] = {}
    city_ids: Dict[Tuple[str, str], int] = {}

    with conn.cursor() as cursor:
        for country, cities in countries_cities.items():
            cursor.execute(
                f"SELECT id FROM `{TABLE_COUNTRY}` WHERE country_name=%s AND (is_deleted=FALSE OR is_deleted IS NULL) LIMIT 1",
                (country,),
            )
            row = cursor.fetchone()
            if row:
                country_id = row[0]
            else:
                cursor.execute(
                    f"INSERT INTO `{TABLE_COUNTRY}` (currency, country_name, is_deleted, created_at, updated_at) "
                    "VALUES (%s, %s, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    ("USD", country),
                )
                country_id = cursor.lastrowid
            country_ids[country] = country_id

            for city in cities:
                cursor.execute(
                    f"SELECT id FROM `{TABLE_CITY}` WHERE country_id=%s AND city_name=%s AND (is_deleted=FALSE OR is_deleted IS NULL) LIMIT 1",
                    (country_id, city),
                )
                city_row = cursor.fetchone()
                if city_row:
                    city_id = city_row[0]
                else:
                    cursor.execute(
                        f"INSERT INTO `{TABLE_CITY}` (country_id, city_name, is_deleted, created_at, updated_at) "
                        "VALUES (%s, %s, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                        (country_id, city),
                    )
                    city_id = cursor.lastrowid
                city_ids[(country, city)] = city_id

    conn.commit()
    return country_ids, city_ids


def get_country_id_by_name(conn, country_name: str) -> Optional[int]:
    with conn.cursor() as cursor:
        cursor.execute(
            f"SELECT id FROM `{TABLE_COUNTRY}` WHERE country_name=%s AND (is_deleted=FALSE OR is_deleted IS NULL) LIMIT 1",
            (country_name,),
        )
        row = cursor.fetchone()
    return None if not row else int(row[0])


def get_city_id_by_country_city_name(conn, country_name: str, city_name: str) -> Optional[int]:
    with conn.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT c.id
            FROM `{TABLE_CITY}` c
            JOIN `{TABLE_COUNTRY}` co ON c.country_id = co.id
            WHERE co.country_name=%s
              AND c.city_name=%s
              AND (co.is_deleted=FALSE OR co.is_deleted IS NULL)
              AND (c.is_deleted=FALSE OR c.is_deleted IS NULL)
            LIMIT 1
            """,
            (country_name, city_name),
        )
        row = cursor.fetchone()
    return None if not row else int(row[0])


def _get_active_target_ids(conn, table_name: str, owner_column: str, owner_ids: List[int]) -> Dict[int, int]:
    if not owner_ids:
        return {}

    placeholders = ", ".join(["%s"] * len(owner_ids))
    query = (
        f"SELECT id, {owner_column} "
        f"FROM `{table_name}` "
        f"WHERE {owner_column} IN ({placeholders}) "
        "AND (is_deleted=FALSE OR is_deleted IS NULL)"
    )
    with conn.cursor() as cursor:
        cursor.execute(query, owner_ids)
        rows = cursor.fetchall()
    return {int(row[1]): int(row[0]) for row in rows}


def _bulk_upsert_costs(conn, table_name: str, owner_column: str, rows: List[Tuple[int, Dict[str, Any]]]) -> None:
    if not rows:
        return

    normalized_rows = [(owner_id, build_price_column_values(data)) for owner_id, data in rows]
    columns = list(normalized_rows[0][1].keys())
    existing_ids = _get_active_target_ids(
        conn,
        table_name=table_name,
        owner_column=owner_column,
        owner_ids=[owner_id for owner_id, _ in normalized_rows],
    )

    update_sql = ", ".join([*(f"`{column}`=%s" for column in columns), "updated_at=CURRENT_TIMESTAMP"])
    insert_columns = ", ".join(
        [f"`{owner_column}`"] + [f"`{column}`" for column in columns] + ["`is_deleted`", "`created_at`", "`updated_at`"]
    )
    insert_values = ", ".join(["%s"] * (len(columns) + 1) + ["FALSE", "CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP"])

    update_params = []
    insert_params = []

    for owner_id, values in normalized_rows:
        ordered_values = [values[column] for column in columns]
        target_id = existing_ids.get(owner_id)
        if target_id is not None:
            update_params.append(ordered_values + [target_id])
        else:
            insert_params.append([owner_id] + ordered_values)

    with conn.cursor() as cursor:
        if update_params:
            cursor.executemany(
                f"UPDATE `{table_name}` SET {update_sql} WHERE id=%s",
                update_params,
            )
        if insert_params:
            cursor.executemany(
                f"INSERT INTO `{table_name}` ({insert_columns}) VALUES ({insert_values})",
                insert_params,
            )


def bulk_upsert_country_costs(conn, rows: List[Tuple[int, Dict[str, Any]]]) -> None:
    _bulk_upsert_costs(
        conn,
        table_name=TABLE_COUNTRY_COST,
        owner_column="country_id",
        rows=rows,
    )


def upsert_country_cost(conn, country_id: int, data: Dict[str, Any]) -> None:
    bulk_upsert_country_costs(conn, [(country_id, data)])
    conn.commit()


def bulk_upsert_city_costs(conn, rows: List[Tuple[int, Dict[str, Any]]]) -> None:
    _bulk_upsert_costs(
        conn,
        table_name=TABLE_CITY_COST,
        owner_column="city_id",
        rows=rows,
    )


def upsert_city_cost(conn, city_id: int, data: Dict[str, Any]) -> None:
    bulk_upsert_city_costs(conn, [(city_id, data)])
    conn.commit()


def soft_delete_existing_price_data(conn) -> None:
    with conn.cursor() as cursor:
        cursor.execute(
            f"UPDATE `{TABLE_COUNTRY_COST}` SET is_deleted=TRUE, updated_at=CURRENT_TIMESTAMP WHERE is_deleted=FALSE"
        )
        cursor.execute(
            f"UPDATE `{TABLE_CITY_COST}` SET is_deleted=TRUE, updated_at=CURRENT_TIMESTAMP WHERE is_deleted=FALSE"
        )
