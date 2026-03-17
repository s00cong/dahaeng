"""DB schema bootstrap and connection helpers."""

import os
import pymysql


create_table_queries = {}

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
    """紐⑤뱺 CREATE TABLE IF NOT EXISTS 荑쇰━瑜??ㅽ뻾?쒕떎."""
    own_conn = conn is None
    if own_conn:
        conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            for table_name, query in create_table_queries.items():
                cursor.execute(query)
                print(f"{table_name} table ensured")
        conn.commit()
    finally:
        if own_conn:
            conn.close()


if __name__ == "__main__":
    create_tables_if_not_exists()
