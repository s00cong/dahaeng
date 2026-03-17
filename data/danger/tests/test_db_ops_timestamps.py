import unittest

from danger.modules.db_ops import upsert_danger_row


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


class UpsertDangerRowTimestampTest(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "id": 10,
            "country_id": 20,
            "attention": "1",
            "attention_partial": "a",
            "attention_note": "n1",
            "ban_note": "n2",
            "ban_yn_partial": "y",
            "ban_yna": "n",
            "control": "2",
            "control_partial": "b",
            "control_note": "n3",
            "country_name": "Korea",
            "country_en_name": "Korea",
            "limita": "3",
            "limita_partial": "c",
            "limita_note": "n4",
            "evacuate_rcmnd_remark": "e",
            "evacuate_region_ty": "r1",
            "forbidden_rcmnd_remark": "f",
            "forbidden__region_ty": "r2",
        }

    def test_update_path_updates_only_updated_at(self):
        conn = FakeConnection(fetchone_results=[(999,)])

        upsert_danger_row(conn, self.payload)

        self.assertEqual(2, len(conn.cursor_obj.executed))
        update_sql = conn.cursor_obj.executed[1][0]
        self.assertIn("updated_at=CURRENT_TIMESTAMP", update_sql)
        self.assertNotIn("created_at=", update_sql)
        self.assertEqual(1, conn.commit_called)

    def test_insert_path_sets_created_and_updated_at(self):
        conn = FakeConnection(fetchone_results=[None])

        upsert_danger_row(conn, self.payload)

        self.assertEqual(2, len(conn.cursor_obj.executed))
        insert_sql = conn.cursor_obj.executed[1][0]
        self.assertIn("created_at", insert_sql)
        self.assertIn("updated_at", insert_sql)
        self.assertIn("CURRENT_TIMESTAMP", insert_sql)
        self.assertEqual(1, conn.commit_called)


if __name__ == "__main__":
    unittest.main()
