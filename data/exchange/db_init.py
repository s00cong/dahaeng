"""DB schema bootstrap and connection helpers."""

import os
import pymysql


create_table_queries = {}

def get_db_connection():
    """?섍꼍蹂?섏뿉???묒냽 ?뺣낫瑜??쎌뼱 DB 而ㅻ꽖?섏쓣 ?앹꽦?쒕떎."""
    return pymysql.connect(
        host=os.getenv("DB_HOST", "j14d206.p.ssafy.io"),
        user=os.getenv("DB_USER", "d206"),
        password=os.getenv("DB_PASSWORD", "d206-1111"),
        database=os.getenv("DB_NAME", "dahaeng"),
        charset="utf8mb4",
        autocommit=False,
        port=int(os.getenv("DB_PORT", "8900")),
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

