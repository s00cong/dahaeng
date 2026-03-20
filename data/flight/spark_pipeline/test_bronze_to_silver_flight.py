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
