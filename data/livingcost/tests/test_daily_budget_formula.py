import unittest

from livingcost.livingcost_crawler.db_ops import build_price_column_values


class DailyBudgetFormulaTest(unittest.TestCase):
    def test_daily_budget_uses_traveler_formula(self):
        payload = {
            "data": {
                "food": [
                    {"item": "Lunch Menu", "usd": 10.0},
                    {"item": "Dinner in a Restaurant, for 2", "usd": 40.0},
                    {"item": "Cappuccino", "usd": 3.0},
                    {"item": "Pepsi / Coke, 0.5 L or 16.9 fl oz", "usd": 2.0},
                    {"item": "Local transport ticket", "usd": 1.5},
                ]
            },
            "overview": {},
        }

        values = build_price_column_values(payload)

        expected = (0.5 * 10.0) + (1.0 * 10.0) + (40.0 / 2.0) + (1.0 * 3.0) + (1.0 * 2.0) + (2.0 * 1.5)
        self.assertAlmostEqual(expected, values["daily_budget"], places=6)


if __name__ == "__main__":
    unittest.main()
