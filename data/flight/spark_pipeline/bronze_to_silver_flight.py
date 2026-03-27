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
import json
import os
from pathlib import Path

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import IntegerType, StructType
from pyspark.sql.window import Window

from city_id_mapping import load_code_to_city_name, parse_mysql_connection_info


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MAPPING_PATH = BASE_DIR.parent / "trip_com" / "city_airport_mapping.json"


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
    parser.add_argument(
        "--mapping-path",
        default=str(DEFAULT_MAPPING_PATH),
        help="Trip.com city mapping JSON path",
    )
    return parser.parse_args()


def normalize_city_key(column_name: str):
    return F.upper(F.trim(F.col(column_name)))


def nested_field_exists(schema: StructType, field_path: str) -> bool:
    current_type = schema
    for field_name in field_path.split("."):
        if not isinstance(current_type, StructType):
            return False
        matching_field = next(
            (field for field in current_type.fields if field.name == field_name),
            None,
        )
        if matching_field is None:
            return False
        current_type = matching_field.dataType
    return True


def build_first_available_column(df: DataFrame, field_paths: list[str]):
    available_paths = [
        field_path for field_path in field_paths if nested_field_exists(df.schema, field_path)
    ]
    if not available_paths:
        joined = ", ".join(field_paths)
        raise RuntimeError(f"None of the expected fields exist: {joined}")
    if len(available_paths) == 1:
        return F.col(available_paths[0])
    return F.coalesce(*[F.col(field_path) for field_path in available_paths])


def build_city_name_mapping_expr(code_to_city_name: dict[str, str]):
    items = []
    for city_code, city_name in code_to_city_name.items():
        items.extend([F.lit(city_code), F.lit(city_name)])
    if not items:
        return None
    return F.create_map(*items)


def resolve_tripcom_direction_column():
    normalized_direction = F.lower(F.trim(F.col("entity.direction")))
    normalized_origin = normalize_city_key("entity.origin")
    return (
        F.when(normalized_direction.isin("outbound", "inbound"), normalized_direction)
        .when(normalized_origin == F.lit("ICN"), F.lit("outbound"))
        .when(normalized_origin.isNotNull(), F.lit("inbound"))
        .otherwise(F.lit(None))
    )


def read_google_normalized(spark: SparkSession, google_path: str) -> DataFrame:
    print(f"[INFO] Reading Google Flights normalized JSONL from: {google_path}")
    df_raw = spark.read.json(google_path)

    return df_raw.filter(
        (F.col("dataset") == "airticket")
        & (F.col("entity.route_type") == "explore_monthly_snapshot")
    )


def transform_to_silver(df: DataFrame, df_tripcom_avg: DataFrame | None = None) -> DataFrame:
    google_city_column = build_first_available_column(
        df,
        ["entity.city_id", "entity.city_code"],
    )
    duration_column = build_first_available_column(
        df,
        ["payload.min_duration_minutes", "payload.avg_duration_minutes"],
    )
    df_silver = df.select(
        google_city_column.alias("city_code"),
        F.col("entity.city_name").alias("city_name"),
        F.col("entity.year_month").alias("year_month"),
        F.col("entity.origin_airport").alias("origin_airport"),
        F.col("payload.typical_stops_count").cast(IntegerType()).alias("stops"),
        duration_column.cast(IntegerType()).alias("flight_duration"),
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

    latest_window = Window.partitionBy("city_join_key", "year_month").orderBy(
        F.col("flight_collected_date").desc()
    )
    best_flight_window = Window.partitionBy("city_join_key").orderBy(
        F.col("flight_duration").asc_nulls_last(),
        F.col("stops").asc_nulls_last(),
        F.col("flight_collected_date").desc(),
    )
    df_latest = (
        df_silver.withColumn("rn", F.row_number().over(latest_window))
        .filter(F.col("rn") == 1)
        .drop("rn")
    )
    df_best_flight = (
        df_silver.withColumn("best_flight_rn", F.row_number().over(best_flight_window))
        .filter(F.col("best_flight_rn") == 1)
        .select(
            F.col("city_join_key"),
            F.col("stops").alias("best_stops"),
            F.col("flight_duration").alias("best_flight_duration"),
        )
        .drop("best_flight_rn")
    )
    df_dedup = (
        df_latest.join(df_best_flight, on=["city_join_key"], how="left")
        .withColumn("stops", F.coalesce(F.col("best_stops"), F.col("stops")))
        .withColumn(
            "flight_duration",
            F.coalesce(F.col("best_flight_duration"), F.col("flight_duration")),
        )
        .drop("best_stops", "best_flight_duration")
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
        .withColumn(
            "flight_collected_date",
            F.coalesce(F.col("tc_flight_collected_date"), F.col("flight_collected_date")),
        )
        .drop("tc_avg_flight_price", "tc_flight_collected_date")
    )


def read_and_agg_tripcom_price(
    spark: SparkSession, tripcom_path: str
) -> DataFrame | None:
    print(f"[INFO] Reading Trip.com Bronze from: {tripcom_path}")

    try:
        df_raw = (
            spark.read.option("recursiveFileLookup", "true")
            .option("pathGlobFilter", "*.jsonl")
            .json(tripcom_path)
        )
    except Exception as exc:
        print(f"[WARN] Failed to read Trip.com Bronze: {exc}")
        return None

    tripcom_city_column = build_first_available_column(
        df_raw,
        ["entity.city_code", "entity.city_id"],
    )
    tripcom_direction_column = resolve_tripcom_direction_column()

    directional_averages = (
        df_raw.select(
            tripcom_city_column.alias("city_code"),
            F.substring(F.col("event_time"), 1, 7).alias("year_month"),
            tripcom_direction_column.alias("direction"),
            F.col("payload.price").alias("price"),
            F.to_timestamp(F.col("event_time")).alias("flight_collected_date"),
        )
        .filter(F.col("price").isNotNull() & F.col("direction").isin("outbound", "inbound"))
        .withColumn("city_join_key", normalize_city_key("city_code"))
        .groupBy("city_join_key", "year_month", "direction")
        .agg(
            F.round(F.avg("price")).cast("integer").alias("directional_avg_flight_price"),
            F.max("flight_collected_date").alias("directional_flight_collected_date"),
        )
    )

    return directional_averages.groupBy("city_join_key", "year_month").agg(
        F.sum("directional_avg_flight_price").cast("integer").alias("tc_avg_flight_price"),
        F.max("directional_flight_collected_date").alias("tc_flight_collected_date"),
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


def attach_city_ids(
    df: DataFrame, city_lookup: DataFrame, code_to_city_name: dict[str, str]
) -> DataFrame:
    city_name_mapping = build_city_name_mapping_expr(code_to_city_name)
    mapped_city_name = (
        city_name_mapping[F.col("city_code")] if city_name_mapping is not None else F.lit(None)
    )

    resolved_df = (
        df.withColumn("resolved_city_name", F.coalesce(mapped_city_name, F.col("city_name")))
        .withColumn("city_join_key", normalize_city_key("resolved_city_name"))
    )

    fail_on_unmatched_city_keys(resolved_df, city_lookup)

    return (
        resolved_df.join(
            city_lookup.select("city_id", "city_join_key"), on="city_join_key", how="inner"
        )
        .select(
            F.col("city_code"),
            F.col("city_id"),
            F.col("resolved_city_name").alias("city_name"),
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


def apply_cross_month_fallbacks(df: DataFrame) -> DataFrame:
    city_flight_window = (
        Window.partitionBy("city_id")
        .orderBy(F.col("flight_collected_date").desc_nulls_last())
        .rowsBetween(Window.unboundedPreceding, Window.unboundedFollowing)
    )
    city_hotel_window = (
        Window.partitionBy("city_id")
        .orderBy(F.col("hotel_collected_date").desc_nulls_last())
        .rowsBetween(Window.unboundedPreceding, Window.unboundedFollowing)
    )

    return (
        df.withColumn(
            "city_latest_avg_flight_price",
            F.first("avg_flight_price", ignorenulls=True).over(city_flight_window),
        )
        .withColumn(
            "city_latest_avg_hotel_price",
            F.first("avg_hotel_price", ignorenulls=True).over(city_hotel_window),
        )
        .withColumn(
            "avg_flight_price_was_missing",
            F.col("avg_flight_price").isNull() & F.col("city_latest_avg_flight_price").isNull(),
        )
        .withColumn(
            "avg_hotel_price_was_missing",
            F.col("avg_hotel_price").isNull() & F.col("city_latest_avg_hotel_price").isNull(),
        )
        .withColumn(
            "avg_flight_price",
            F.coalesce(
                F.col("avg_flight_price"),
                F.col("city_latest_avg_flight_price"),
                F.lit(0),
            ).cast(IntegerType()),
        )
        .withColumn(
            "avg_hotel_price",
            F.coalesce(
                F.col("avg_hotel_price"),
                F.col("city_latest_avg_hotel_price"),
                F.lit(0),
            ).cast(IntegerType()),
        )
        .drop("city_latest_avg_flight_price", "city_latest_avg_hotel_price")
    )


def collect_missing_value_alerts(df: DataFrame) -> list[dict]:
    alert_rows = (
        df.select(
            F.col("city_id"),
            F.col("city_code"),
            F.col("year_month"),
            F.col("avg_flight_price_was_missing"),
            F.col("avg_hotel_price_was_missing"),
        )
        .filter(F.col("avg_flight_price_was_missing") | F.col("avg_hotel_price_was_missing"))
        .collect()
    )

    missing_value_alerts: list[dict] = []
    for row in alert_rows:
        if row["avg_flight_price_was_missing"]:
            missing_value_alerts.append(
                {
                    "city_id": row["city_id"],
                    "city_code": row["city_code"],
                    "year_month": row["year_month"],
                    "metric": "avg_flight_price",
                }
            )
        if row["avg_hotel_price_was_missing"]:
            missing_value_alerts.append(
                {
                    "city_id": row["city_id"],
                    "city_code": row["city_code"],
                    "year_month": row["year_month"],
                    "metric": "avg_hotel_price",
                }
            )

    return missing_value_alerts


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
         `created_at`, `updated_at`, `is_deleted`)
    SELECT
        `city_id`, `year_month`, `origin_airport`,
        `avg_flight_price`, `avg_hotel_price`,
        `stops`, `flight_duration`,
        `peak_month_list`, `off_month_list`,
        `flight_collected_date`, `hotel_collected_date`,
        NOW(), NOW(), b'0'
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
        code_to_city_name = load_code_to_city_name(args.mapping_path)
        df_silver_resolved = attach_city_ids(df_silver, city_lookup, code_to_city_name)
        df_silver_filled = apply_cross_month_fallbacks(df_silver_resolved)
        missing_value_alerts = collect_missing_value_alerts(df_silver_filled)
        if missing_value_alerts:
            print(
                json.dumps(
                    {"missing_value_alerts": missing_value_alerts},
                    ensure_ascii=False,
                    indent=2,
                )
            )

        df_final = df_silver_filled.drop(
            "avg_flight_price_was_missing",
            "avg_hotel_price_was_missing",
        )
        write_silver(df_final, args.silver_path)
        write_to_mariadb(
            df_final,
            args.db_url,
            args.db_user,
            args.db_password,
        )
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
