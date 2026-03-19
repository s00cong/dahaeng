"""
bronze_to_silver_calendar.py
============================
Aggregate Trip.com bronze calendar snapshots into MongoDB documents.

This pipeline now resolves city IDs from the MariaDB city table and fails
if any Bronze city code cannot be matched to city.city_name.
"""

from __future__ import annotations

import argparse
import os

from pyspark.sql import SparkSession
from pyspark.sql import functions as F


def parse_args():
    parser = argparse.ArgumentParser(description="Bronze -> MongoDB ETL for calendar data")
    parser.add_argument(
        "--bronze-path",
        default="hdfs://namenode:9000/data/bronze/flight/trip_com",
        help="Trip.com Bronze base path",
    )
    parser.add_argument(
        "--silver-path",
        default="hdfs://namenode:9000/data/silver/flight/trip_com_daily_prices",
        help="Trip.com Silver parquet output path",
    )
    parser.add_argument(
        "--mongo-uri",
        default="mongodb://localhost:27017/dahaeng.flight_price_calendar",
        help="MongoDB URI",
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
    return parser.parse_args()


def normalize_city_key(column_name: str):
    return F.upper(F.trim(F.col(column_name)))


def resolve_tripcom_direction_column():
    normalized_direction = F.lower(F.trim(F.col("entity.direction")))
    normalized_origin = normalize_city_key("entity.origin")
    return (
        F.when(normalized_direction.isin("outbound", "inbound"), normalized_direction)
        .when(normalized_origin == F.lit("ICN"), F.lit("outbound"))
        .when(normalized_origin.isNotNull(), F.lit("inbound"))
        .otherwise(F.lit(None))
    )


def main():
    args = parse_args()

    spark = (
        SparkSession.builder.appName("Bronze_to_Silver_Mongo_Calendar")
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
        bronze_path_pattern = f"{args.bronze_path}/dt=*/hour=*/*.jsonl"
        print(f"[INFO] Reading Trip.com Bronze from: {bronze_path_pattern}")
        df_raw = spark.read.json(bronze_path_pattern)

        df_parsed = (
            df_raw.select(
                F.coalesce(F.col("entity.city_code"), F.col("entity.city_id")).alias(
                    "city_code"
                ),
                F.col("event_time").alias("target_date"),
                F.substring(F.col("event_time"), 1, 7).alias("year_month"),
                resolve_tripcom_direction_column().alias("direction"),
                F.col("payload.price").alias("price"),
                F.substring(F.col("ingest_time"), 1, 10).alias("collected_date"),
            )
            .filter(F.col("price").isNotNull())
            .filter(F.col("direction").isin("outbound", "inbound"))
            .withColumn("city_join_key", normalize_city_key("city_code"))
        )

        city_lookup = (
            spark.read.jdbc(
                url=args.db_url,
                table="city",
                properties={
                    "user": args.db_user,
                    "password": args.db_password,
                    "driver": "com.mysql.cj.jdbc.Driver",
                },
            )
            .select(
                F.col("id").cast("long").alias("numeric_city_id"),
                F.col("city_name").alias("city_name"),
            )
            .withColumn("city_join_key", normalize_city_key("city_name"))
            .filter(F.col("city_join_key").isNotNull())
        )

        unmatched_df = (
            df_parsed.select("city_join_key")
            .filter(F.col("city_join_key").isNotNull())
            .distinct()
            .join(city_lookup.select("city_join_key").distinct(), on="city_join_key", how="left_anti")
        )
        unmatched = [row["city_join_key"] for row in unmatched_df.collect()]
        if unmatched:
            joined = ", ".join(sorted(unmatched))
            raise RuntimeError(f"Unmatched city codes in MariaDB city table: {joined}")

        df_joined = df_parsed.join(
            city_lookup.select("numeric_city_id", "city_join_key"),
            on="city_join_key",
            how="inner",
        )

        print(f"[INFO] Writing Trip.com silver parquet to: {args.silver_path}")
        (
            df_joined.select(
                F.col("numeric_city_id").alias("city_id"),
                F.col("year_month"),
                F.col("target_date"),
                F.col("direction"),
                F.col("price").cast("integer").alias("price"),
                F.col("collected_date"),
            )
            .write.mode("overwrite")
            .partitionBy("city_id", "year_month")
            .parquet(args.silver_path)
        )

        df_structured = df_joined.withColumn(
            "price_info",
            F.struct(
                F.col("target_date").alias("date"),
                F.col("price").cast("integer").alias("price"),
            ),
        )

        df_grouped = df_structured.groupBy(
            "numeric_city_id", "year_month", "collected_date"
        ).agg(
            F.filter(
                F.collect_list(
                    F.when(F.col("direction") == "outbound", F.col("price_info"))
                ),
                lambda value: value.isNotNull(),
            ).alias("outboundDailyPrices"),
            F.filter(
                F.collect_list(
                    F.when(F.col("direction") == "inbound", F.col("price_info"))
                ),
                lambda value: value.isNotNull(),
            ).alias("inboundDailyPrices"),
        )

        df_mongo = df_grouped.select(
            F.concat_ws(
                "-",
                F.col("numeric_city_id").cast("string"),
                F.col("year_month"),
                F.regexp_replace(F.col("collected_date"), "-", ""),
            ).alias("_id"),
            F.col("numeric_city_id").alias("cityId"),
            F.col("year_month").alias("yearMonth"),
            F.col("collected_date").alias("collectedDate"),
            F.col("outboundDailyPrices"),
            F.col("inboundDailyPrices"),
        )

        print(f"[INFO] Writing {df_mongo.count()} calendar documents to MongoDB")
        (
            df_mongo.write.format("mongodb")
            .mode("append")
            .option("spark.mongodb.write.connection.uri", args.mongo_uri)
            .option("spark.mongodb.write.database", "dahaeng")
            .option("spark.mongodb.write.collection", "flight_price_calendar")
            .save()
        )
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
