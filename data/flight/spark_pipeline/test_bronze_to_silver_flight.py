import sys
import types
from pathlib import Path

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))


class FakeColumn:
    def __init__(self, expr):
        self.expr = expr

    def __str__(self):
        return self.expr


class StringType:
    pass


class IntegerType:
    pass


class StructField:
    def __init__(self, name, dataType, nullable=True):
        self.name = name
        self.dataType = dataType
        self.nullable = nullable


class StructType:
    def __init__(self, fields):
        self.fields = fields


fake_functions = types.SimpleNamespace(
    col=lambda name: FakeColumn(name),
    coalesce=lambda *cols: FakeColumn(
        "COALESCE(" + ", ".join(str(col) for col in cols) + ")"
    ),
)

fake_sql_module = types.ModuleType("pyspark.sql")
fake_sql_module.DataFrame = object
fake_sql_module.SparkSession = object
fake_sql_module.functions = fake_functions

fake_types_module = types.ModuleType("pyspark.sql.types")
fake_types_module.IntegerType = IntegerType
fake_types_module.StringType = StringType
fake_types_module.StructField = StructField
fake_types_module.StructType = StructType

fake_window_module = types.ModuleType("pyspark.sql.window")
fake_window_module.Window = object

fake_pyspark_module = types.ModuleType("pyspark")

sys.modules.setdefault("pyspark", fake_pyspark_module)
sys.modules["pyspark.sql"] = fake_sql_module
sys.modules["pyspark.sql.types"] = fake_types_module
sys.modules["pyspark.sql.window"] = fake_window_module

import bronze_to_silver_flight


def test_nested_field_exists_returns_false_for_missing_nested_field():
    schema = StructType(
        [
            StructField(
                "entity",
                StructType(
                    [
                        StructField("city_id", StringType(), True),
                        StructField("city_name", StringType(), True),
                    ]
                ),
                True,
            )
        ]
    )

    assert bronze_to_silver_flight.nested_field_exists(schema, "entity.city_id") is True
    assert bronze_to_silver_flight.nested_field_exists(schema, "entity.city_code") is False


def test_build_first_available_column_uses_existing_field_without_missing_sibling():
    class DummyDataFrame:
        def __init__(self, schema):
            self.schema = schema

    schema = StructType(
        [
            StructField(
                "entity",
                StructType(
                    [
                        StructField("city_id", StringType(), True),
                        StructField("city_name", StringType(), True),
                    ]
                ),
                True,
            )
        ]
    )

    column = bronze_to_silver_flight.build_first_available_column(
        DummyDataFrame(schema),
        ["entity.city_id", "entity.city_code"],
    )

    assert "entity.city_id" in str(column)


def test_write_to_mariadb_preserves_is_deleted_zero_flag(monkeypatch):
    class FakeWriter:
        def mode(self, _mode):
            return self

        def jdbc(self, **_kwargs):
            return None

    class FakeSelectedFrame:
        def __init__(self):
            self.write = FakeWriter()

        def count(self):
            return 1

    class FakeDataFrame:
        def select(self, *_cols):
            return FakeSelectedFrame()

    captured = {}

    def fake_run_sql(_db_url, _db_user, _db_password, sql):
        captured["sql"] = sql

    monkeypatch.setattr(bronze_to_silver_flight, "_run_sql", fake_run_sql)

    bronze_to_silver_flight.write_to_mariadb(
        FakeDataFrame(),
        "jdbc:mysql://mysql:3306/dahaeng",
        "user",
        "password",
    )

    assert "is_deleted" in captured["sql"]
    assert "b'0'" in captured["sql"]


def test_tripcom_aggregate_tracks_trip_collection_date_and_prefers_it_for_flight_collected_date():
    source = Path(bronze_to_silver_flight.__file__).read_text(encoding="utf-8")

    assert 'alias("tc_flight_collected_date")' in source
    assert '.withColumn(\n            "flight_collected_date",' in source
    assert 'F.coalesce(F.col("tc_flight_collected_date"), F.col("flight_collected_date"))' in source


def test_tripcom_aggregate_sums_directional_monthly_averages_for_round_trip_price():
    source = Path(bronze_to_silver_flight.__file__).read_text(encoding="utf-8")

    assert "def resolve_tripcom_direction_column():" in source
    assert 'alias("direction")' in source
    assert '.groupBy("city_join_key", "year_month", "direction")' in source
    assert 'alias("directional_avg_flight_price")' in source
    assert 'F.sum("directional_avg_flight_price").cast("integer").alias("tc_avg_flight_price")' in source


def test_spark_pipeline_uses_shortest_duration_row_for_flight_duration_and_stops():
    source = Path(bronze_to_silver_flight.__file__).read_text(encoding="utf-8")

    assert 'best_flight_window = Window.partitionBy("city_join_key").orderBy(' in source
    assert 'F.col("flight_duration").asc_nulls_last()' in source
    assert 'F.col("stops").asc_nulls_last()' in source
    assert 'withColumn("best_flight_rn", F.row_number().over(best_flight_window))' in source
    assert '.select(\n            F.col("city_join_key"),' in source
    assert '.drop("best_flight_rn")' in source


def test_spark_pipeline_applies_cross_month_fallbacks_and_tracks_missing_alerts():
    source = Path(bronze_to_silver_flight.__file__).read_text(encoding="utf-8")

    assert "def apply_cross_month_fallbacks(" in source
    assert 'F.first("avg_flight_price", ignorenulls=True)' in source
    assert 'F.first("avg_hotel_price", ignorenulls=True)' in source
    assert "def collect_missing_value_alerts(" in source
    assert '"missing_value_alerts"' in source


def test_spark_pipeline_reads_min_duration_payload_field():
    source = Path(bronze_to_silver_flight.__file__).read_text(encoding="utf-8")

    assert "duration_column = build_first_available_column(" in source
    assert '["payload.min_duration_minutes", "payload.avg_duration_minutes"]' in source
    assert 'duration_column.cast(IntegerType()).alias("flight_duration")' in source
