"""
bronze_to_silver_flight.py
==========================
Load Google Flights bronze JSONL, enrich with Trip.com averages,
write Silver parquet, and upsert flight_summary rows into MariaDB.

This pipeline now requires a successful lookup against the MariaDB city table.
Hash-based city IDs are no longer used.
"""

from __future__ import annotations

import argparse
import os

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import IntegerType
from pyspark.sql.window import Window

from city_id_mapping import parse_mysql_connection_info


def parse_args():
    parser = argparse.ArgumentParser(
        description="Bronze -> Silver -> MariaDB ETL for flight data"
    )
    parser.add_argument(
        "--google-path",
        default="/workspace/data/flight/normalized/google_flight.jsonl",
        help="Google Flights normalized JSONL path",
    )
    parser.add_argument(
        "--silver-path",
        default="hdfs://namenode:9000/data/silver/flight/flight_summary",
        help="Silver parquet output path",
    )
    parser.add_argument(
        "--db-url",
        default=os.getenv("DB_URL", "jdbc:mysql://localhost:3306/dahaeng"),
        help="MariaDB JDBC URL",
    )
    parser.add_argument(
        "--db-user",
        default=os.getenv("DB_USERNAME", "root"),
        help="MariaDB username",
    )
    parser.add_argument(
        "--db-password",
        default=os.getenv("DB_PASSWORD", ""),
        help="MariaDB password",
    )
    parser.add_argument(
        "--tripcom-path",
        default="hdfs://namenode:9000/data/bronze/flight/trip_com",
        help="Trip.com Bronze base path",
    )
    return parser.parse_args()


def normalize_city_key(column_name: str):
    return F.upper(F.trim(F.col(column_name)))


def read_google_normalized(spark: SparkSession, google_path: str) -> DataFrame:
    print(f"[INFO] Reading Google Flights normalized JSONL from: {google_path}")
    df_raw = spark.read.json(google_path)

    return df_raw.filter(
        (F.col("dataset") == "airticket")
        & (F.col("entity.route_type") == "explore_monthly_snapshot")
    )


def transform_to_silver(df: DataFrame, df_tripcom_avg: DataFrame | None = None) -> DataFrame:
    df_silver = df.select(
        F.coalesce(F.col("entity.city_id"), F.col("entity.city_code")).alias("city_code"),
        F.col("entity.city_name").alias("city_name"),
        F.col("entity.year_month").alias("year_month"),
        F.col("entity.origin_airport").alias("origin_airport"),
        F.col("payload.typical_stops_count").cast(IntegerType()).alias("stops"),
        F.col("payload.avg_duration_minutes").cast(IntegerType()).alias("flight_duration"),
        F.col("payload.hotel_price").cast(IntegerType()).alias("avg_hotel_price"),
        F.col("payload.peak_season_months_list").alias("peak_month_list"),
        F.col("payload.off_season_months_list").alias("off_month_list"),
        F.to_timestamp(F.col("payload.collected_at"), "yyyy-MM-dd HH:mm:ss").alias(
            "flight_collected_date"
        ),
        F.to_timestamp(F.col("payload.collected_at"), "yyyy-MM-dd HH:mm:ss").alias(
            "hotel_collected_date"
        ),
        F.to_date(F.col("ingest_time")).alias("ingest_date"),
    ).withColumn("city_join_key", normalize_city_key("city_code"))

    window = Window.partitionBy("city_join_key", "year_month").orderBy(
        F.col("flight_collected_date").desc()
    )
    df_dedup = (
        df_silver.withColumn("rn", F.row_number().over(window))
        .filter(F.col("rn") == 1)
        .drop("rn")
    )

    if df_tripcom_avg is None:
        return df_dedup.withColumn("avg_flight_price", F.lit(None).cast(IntegerType()))

    return (
        df_dedup.join(
            df_tripcom_avg,
            on=["city_join_key", "year_month"],
            how="left",
        )
        .withColumn("avg_flight_price", F.col("tc_avg_flight_price"))
        .drop("tc_avg_flight_price")
    )


def read_and_agg_tripcom_price(
    spark: SparkSession, tripcom_path: str
) -> DataFrame | None:
    pattern = f"{tripcom_path}/dt=*/hour=*/*.jsonl"
    print(f"[INFO] Reading Trip.com Bronze from: {pattern}")

    try:
        df_raw = spark.read.json(pattern)
    except Exception as exc:
        print(f"[WARN] Failed to read Trip.com Bronze: {exc}")
        return None

    return (
        df_raw.select(
            F.coalesce(F.col("entity.city_code"), F.col("entity.city_id")).alias(
                "city_code"
            ),
            F.substring(F.col("event_time"), 1, 7).alias("year_month"),
            F.col("payload.price").alias("price"),
        )
        .filter(F.col("price").isNotNull())
        .withColumn("city_join_key", normalize_city_key("city_code"))
        .groupBy("city_join_key", "year_month")
        .agg(F.round(F.avg("price")).cast("integer").alias("tc_avg_flight_price"))
    )


def read_city_lookup(
    spark: SparkSession, db_url: str, db_user: str, db_password: str
) -> DataFrame:
    print("[INFO] Loading city lookup from MariaDB city table")
    return (
        spark.read.jdbc(
            url=db_url,
            table="city",
            properties={
                "user": db_user,
                "password": db_password,
                "driver": "com.mysql.cj.jdbc.Driver",
            },
        )
        .select(
            F.col("id").cast("long").alias("city_id"),
            F.col("city_name").alias("city_name"),
        )
        .withColumn("city_join_key", normalize_city_key("city_name"))
        .filter(F.col("city_join_key").isNotNull())
    )


def fail_on_unmatched_city_keys(df: DataFrame, city_lookup: DataFrame) -> None:
    unmatched_df = (
        df.select("city_join_key")
        .filter(F.col("city_join_key").isNotNull())
        .distinct()
        .join(city_lookup.select("city_join_key").distinct(), on="city_join_key", how="left_anti")
    )
    unmatched = [row["city_join_key"] for row in unmatched_df.collect()]
    if unmatched:
        joined = ", ".join(sorted(unmatched))
        raise RuntimeError(f"Unmatched city codes in MariaDB city table: {joined}")


def attach_city_ids(df: DataFrame, city_lookup: DataFrame) -> DataFrame:
    fail_on_unmatched_city_keys(df, city_lookup)

    return (
        df.join(city_lookup.select("city_id", "city_join_key"), on="city_join_key", how="inner")
        .select(
            F.col("city_code"),
            F.col("city_id"),
            F.col("city_name"),
            F.col("year_month"),
            F.col("origin_airport"),
            F.col("avg_flight_price"),
            F.col("avg_hotel_price"),
            F.col("stops"),
            F.col("flight_duration"),
            F.col("peak_month_list"),
            F.col("off_month_list"),
            F.col("flight_collected_date"),
            F.col("hotel_collected_date"),
            F.col("ingest_date"),
            F.col("city_join_key"),
        )
    )


def write_silver(df: DataFrame, silver_path: str) -> None:
    print(f"[INFO] Writing Silver parquet to: {silver_path}")
    (
        df.write.mode("overwrite")
        .partitionBy("city_id", "year_month")
        .parquet(silver_path)
    )


def write_to_mariadb(
    df: DataFrame, db_url: str, db_user: str, db_password: str
) -> None:
    df_joined = df.select(
        F.col("city_id"),
        F.col("year_month"),
        F.col("origin_airport"),
        F.col("avg_flight_price"),
        F.col("avg_hotel_price"),
        F.col("stops"),
        F.col("flight_duration"),
        F.col("peak_month_list"),
        F.col("off_month_list"),
        F.col("flight_collected_date"),
        F.col("hotel_collected_date"),
    )

    staging_table = "stg_flight_summary"
    row_count = df_joined.count()
    print(f"[INFO] Writing {row_count} rows to staging table: {staging_table}")

    (
        df_joined.write.mode("overwrite")
        .jdbc(
            url=db_url,
            table=staging_table,
            properties={
                "user": db_user,
                "password": db_password,
                "driver": "com.mysql.cj.jdbc.Driver",
                "truncate": "true",
            },
        )
    )

    sql = f"""
    REPLACE INTO flight_summary
        (`city_id`, `target_year_month`, `origin_airport`,
         `avg_flight_price`, `avg_hotel_price`,
         `stops`, `flight_duration`,
         `peak_month_list`, `off_month_list`,
         `flight_collected_date`, `hotel_collected_date`,
         `created_at`, `updated_at`)
    SELECT
        `city_id`, `year_month`, `origin_airport`,
        `avg_flight_price`, `avg_hotel_price`,
        `stops`, `flight_duration`,
        `peak_month_list`, `off_month_list`,
        `flight_collected_date`, `hotel_collected_date`,
        NOW(), NOW()
    FROM {staging_table};
    """

    _run_sql(db_url, db_user, db_password, sql)
    print("[INFO] MariaDB flight_summary upsert complete")


def _run_sql(db_url: str, db_user: str, db_password: str, sql: str) -> None:
    try:
        import pymysql
    except ImportError as exc:
        raise RuntimeError("pymysql is required to execute MariaDB upsert SQL") from exc

    connection_info = parse_mysql_connection_info(db_url)
    print(
        "[INFO] Executing final SQL on "
        f"{connection_info['host']}:{connection_info['port']}/{connection_info['database']}"
    )

    connection = pymysql.connect(
        host=connection_info["host"],
        port=connection_info["port"],
        user=db_user,
        password=db_password,
        database=connection_info["database"],
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS=0;")
            cursor.execute(sql)
            cursor.execute("SET FOREIGN_KEY_CHECKS=1;")
    finally:
        connection.close()


def main():
    args = parse_args()

    spark = (
        SparkSession.builder.appName("Bronze_to_Silver_flight_summary")
        .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
        .config(
            "spark.jars.packages",
            ",".join(
                [
                    "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0",
                    "com.mysql:mysql-connector-j:8.4.0",
                ]
            ),
        )
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    try:
        df_raw = read_google_normalized(spark, args.google_path)
        df_tripcom_avg = read_and_agg_tripcom_price(spark, args.tripcom_path)
        df_silver = transform_to_silver(df_raw, df_tripcom_avg)
        city_lookup = read_city_lookup(spark, args.db_url, args.db_user, args.db_password)
        df_silver_resolved = attach_city_ids(df_silver, city_lookup)
        write_silver(df_silver_resolved, args.silver_path)
        write_to_mariadb(
            df_silver_resolved,
            args.db_url,
            args.db_user,
            args.db_password,
        )
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
