import unittest

from livingcost.livingcost_crawler.db_ops import (
    soft_delete_existing_price_data,
    upsert_city_cost,
    upsert_country_cost,
)


class FakeCursor:
    def __init__(self, fetchone_results):
        self.fetchone_results = list(fetchone_results)
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        if self.fetchone_results:
            return self.fetchone_results.pop(0)
        return None


class FakeConnection:
    def __init__(self, fetchone_results):
        self.cursor_obj = FakeCursor(fetchone_results)
        self.commit_called = 0

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.commit_called += 1


class LivingcostInsertDefaultsTest(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "data": {
                "food": [
                    {"item": "Lunch menu", "usd": 10.0},
                    {"item": "Dinner for two", "usd": 40.0},
                    {"item": "Cappuccino", "usd": 3.0},
                    {"item": "Coke/Pepsi", "usd": 2.0},
                    {"item": "Local transport ticket", "usd": 1.5},
                ]
            },
            "overview": {},
        }

    def test_country_cost_insert_includes_default_columns(self):
        conn = FakeConnection(fetchone_results=[None])

        upsert_country_cost(conn, 1, self.payload)

        self.assertEqual(2, len(conn.cursor_obj.executed))
        insert_sql = conn.cursor_obj.executed[1][0]
        self.assertIn("`is_deleted`", insert_sql)
        self.assertIn("`created_at`", insert_sql)
        self.assertIn("`updated_at`", insert_sql)
        self.assertIn("FALSE", insert_sql)
        self.assertIn("CURRENT_TIMESTAMP", insert_sql)
        self.assertEqual(1, conn.commit_called)

    def test_city_cost_insert_includes_default_columns(self):
        conn = FakeConnection(fetchone_results=[None])

        upsert_city_cost(conn, 1, self.payload)

        self.assertEqual(2, len(conn.cursor_obj.executed))
        insert_sql = conn.cursor_obj.executed[1][0]
        self.assertIn("`is_deleted`", insert_sql)
        self.assertIn("`created_at`", insert_sql)
        self.assertIn("`updated_at`", insert_sql)
        self.assertIn("FALSE", insert_sql)
        self.assertIn("CURRENT_TIMESTAMP", insert_sql)
        self.assertEqual(1, conn.commit_called)

    def test_country_cost_update_sets_updated_at(self):
        conn = FakeConnection(fetchone_results=[(11,)])

        upsert_country_cost(conn, 1, self.payload)

        self.assertEqual(2, len(conn.cursor_obj.executed))
        update_sql = conn.cursor_obj.executed[1][0]
        self.assertIn("updated_at=CURRENT_TIMESTAMP", update_sql)
        self.assertEqual(1, conn.commit_called)

    def test_city_cost_update_sets_updated_at(self):
        conn = FakeConnection(fetchone_results=[(22,)])

        upsert_city_cost(conn, 1, self.payload)

        self.assertEqual(2, len(conn.cursor_obj.executed))
        update_sql = conn.cursor_obj.executed[1][0]
        self.assertIn("updated_at=CURRENT_TIMESTAMP", update_sql)
        self.assertEqual(1, conn.commit_called)

    def test_soft_delete_updates_updated_at(self):
        conn = FakeConnection(fetchone_results=[])

        soft_delete_existing_price_data(conn)

        self.assertEqual(2, len(conn.cursor_obj.executed))
        first_update_sql = conn.cursor_obj.executed[0][0]
        second_update_sql = conn.cursor_obj.executed[1][0]
        self.assertIn("updated_at=CURRENT_TIMESTAMP", first_update_sql)
        self.assertIn("updated_at=CURRENT_TIMESTAMP", second_update_sql)
        self.assertEqual(1, conn.commit_called)


if __name__ == "__main__":
    unittest.main()
