import importlib.util
import asyncio
import json
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("google_flight_scraper.py")
SPEC = importlib.util.spec_from_file_location("google_flight_scraper", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class GoogleFlightScraperHelpersTest(unittest.TestCase):
    def test_get_browser_slow_mo_defaults_to_zero(self):
        with patch.dict(MODULE.os.environ, {}, clear=False):
            self.assertEqual(MODULE.get_browser_slow_mo(headless=False), 0)

    def test_get_browser_slow_mo_uses_env_override(self):
        with patch.dict(MODULE.os.environ, {"GOOGLE_FLIGHT_SLOW_MO_MS": "15"}, clear=False):
            self.assertEqual(MODULE.get_browser_slow_mo(headless=False), 15)

    def test_get_result_refresh_timeout_ms_defaults_to_2500(self):
        with patch.dict(MODULE.os.environ, {}, clear=False):
            self.assertEqual(MODULE.get_result_refresh_timeout_ms(), 2500)

    def test_get_result_refresh_timeout_ms_uses_env_override(self):
        with patch.dict(MODULE.os.environ, {"GOOGLE_FLIGHT_RESULT_REFRESH_TIMEOUT_MS": "1200"}, clear=False):
            self.assertEqual(MODULE.get_result_refresh_timeout_ms(), 1200)

    def test_build_browser_launch_kwargs_uses_playwright_chromium_by_default(self):
        with patch.dict(MODULE.os.environ, {}, clear=False):
            kwargs = MODULE.build_browser_launch_kwargs(headless=True, slow_mo=0)

        self.assertNotIn("channel", kwargs)
        self.assertNotIn("executable_path", kwargs)
        self.assertEqual(kwargs["headless"], True)
        self.assertEqual(kwargs["slow_mo"], 0)
        self.assertEqual(kwargs["args"], ["--incognito", "--disable-geolocation"])

    def test_build_browser_launch_kwargs_uses_explicit_channel_when_configured(self):
        with patch.dict(
            MODULE.os.environ,
            {"GOOGLE_FLIGHT_BROWSER_CHANNEL": "chrome"},
            clear=False,
        ):
            kwargs = MODULE.build_browser_launch_kwargs(headless=False, slow_mo=30)

        self.assertEqual(kwargs["channel"], "chrome")
        self.assertNotIn("executable_path", kwargs)

    def test_build_browser_launch_kwargs_uses_executable_path_when_configured(self):
        with patch.dict(
            MODULE.os.environ,
            {"GOOGLE_FLIGHT_BROWSER_EXECUTABLE": "/usr/bin/google-chrome"},
            clear=False,
        ):
            kwargs = MODULE.build_browser_launch_kwargs(headless=True, slow_mo=0)

        self.assertEqual(kwargs["executable_path"], "/usr/bin/google-chrome")
        self.assertNotIn("channel", kwargs)

    def test_build_city_list_preserves_routes(self):
        mapping = [
            {
                "city_code": "HALONG",
                "city_name_kr": "하롱",
                "country_kr": "베트남",
                "routes": [
                    {"trip_city": "vdo", "airport": "VDO", "trip_airport": "vdo"},
                    {"trip_city": "hph", "airport": "HPH", "trip_airport": "hph"},
                ],
            }
        ]

        with tempfile.TemporaryDirectory() as tmp_dir:
            mapping_path = Path(tmp_dir) / "mapping.json"
            mapping_path.write_text(
                json.dumps(mapping, ensure_ascii=False), encoding="utf-8"
            )

            cities = MODULE.build_city_list(mapping_path)

        self.assertEqual(
            cities,
            [
                {
                    "city_id": "HALONG",
                    "city_name_kr": "하롱",
                    "city_name_en": "",
                    "country_kr": "베트남",
                    "country_en": "",
                    "primary_airport": "VDO",
                    "routes": [
                        {"trip_city": "vdo", "airport": "VDO", "trip_airport": "vdo"},
                        {"trip_city": "hph", "airport": "HPH", "trip_airport": "hph"},
                    ],
                }
            ],
        )

    def test_configure_console_utf8_reconfigures_streams(self):
        calls = []

        class FakeStream:
            def reconfigure(self, **kwargs):
                calls.append(kwargs)

        changed = MODULE.configure_console_utf8(FakeStream(), FakeStream())

        self.assertTrue(changed)
        self.assertEqual(
            calls,
            [
                {"encoding": "utf-8", "errors": "replace"},
                {"encoding": "utf-8", "errors": "replace"},
            ],
        )

    def test_parse_season_months_wraps_year_boundary(self):
        self.assertEqual(MODULE.parse_season_months("12월~3월"), "1,2,3,12")

    def test_pick_best_origin_option_prefers_icn_over_daegu(self):
        options = [
            "대한민국 대구 TAE",
            "대한민국 서울 인천국제공항 ICN",
            "일본 도쿄 NRT",
        ]

        self.assertEqual(
            MODULE.pick_best_origin_option(options),
            "대한민국 서울 인천국제공항 ICN",
        )

    def test_pick_best_origin_option_returns_none_when_no_icn_like_option(self):
        options = ["대한민국 대구 TAE", "대한민국 부산 PUS"]
        self.assertIsNone(MODULE.pick_best_origin_option(options))

    def test_origin_value_validation_rejects_daegu(self):
        self.assertFalse(MODULE.is_valid_origin_value("대한민국 대구 TAE"))

    def test_origin_value_validation_accepts_icn(self):
        self.assertTrue(MODULE.is_valid_origin_value("대한민국 서울 인천국제공항 ICN"))

    def test_pick_best_destination_option_scores_matching_city(self):
        city = {
            "city_id": "TOKYO",
            "city_name_kr": "도쿄",
            "country_kr": "일본",
            "primary_airport": "NRT",
        }
        options = [
            "일본 오사카 KIX",
            "일본 도쿄 NRT",
            "일본 나고야 NGO",
        ]

        self.assertEqual(
            MODULE.pick_best_destination_option(options, city),
            "일본 도쿄 NRT",
        )

    def test_pick_best_destination_option_scores_route_aliases(self):
        city = {
            "city_id": "HALONG",
            "city_name_kr": "하롱",
            "country_kr": "베트남",
            "primary_airport": "VDO",
            "routes": [
                {"trip_city": "vdo", "airport": "VDO", "trip_airport": "vdo"},
                {"trip_city": "hph", "airport": "HPH", "trip_airport": "hph"},
            ],
        }
        options = ["하이퐁 HPH", "서울 ICN"]

        self.assertEqual(
            MODULE.pick_best_destination_option(options, city),
            "하이퐁 HPH",
        )

    def test_build_destination_search_terms_includes_route_codes(self):
        city = {
            "city_id": "BULGAN",
            "city_name_kr": "불간",
            "country_kr": "몽골",
            "primary_airport": "UGA",
            "routes": [
                {"trip_city": "uln", "airport": "UGA", "trip_airport": "uga"},
                {"trip_city": "uln", "airport": "UBN", "trip_airport": "ubn"},
            ],
        }

        self.assertEqual(
            MODULE.build_destination_search_terms(city),
            ["불간", "BULGAN", "UGA", "UBN", "ULN", "불간 몽골"],
        )

    def test_build_destination_search_terms_prioritizes_special_city_phrase(self):
        city = {
            "city_id": "AGRA",
            "city_name_kr": "아그라",
            "country_kr": "인도",
            "primary_airport": "AGR",
            "routes": [
                {"trip_city": "agra", "airport": "AGR", "trip_airport": "agr"},
                {"trip_city": "delhi", "airport": "DEL", "trip_airport": "del"},
            ],
        }

        self.assertEqual(
            MODULE.build_destination_search_terms(city)[:3],
            ["아그라 인도", "아그라", "AGRA"],
        )

    def test_build_destination_search_terms_includes_english_name_for_new_york(self):
        city = {
            "city_id": "NEW_YORK",
            "city_name_kr": "뉴욕",
            "city_name_en": "New York City",
            "country_kr": "미국",
            "primary_airport": "JFK",
            "routes": [
                {"trip_city": "nyc", "airport": "JFK", "trip_airport": "jfk"},
            ],
        }

        self.assertEqual(
            MODULE.build_destination_search_terms(city)[:5],
            ["New York", "New York City", "뉴욕", "NEW_YORK", "JFK"],
        )


    def test_filter_cities_by_env_keeps_requested_city_ids_only(self):
        cities = [
            {"city_id": "BULGAN"},
            {"city_id": "IPOH"},
            {"city_id": "TOKYO"},
        ]

        with patch.dict(MODULE.os.environ, {"CITY_IDS": "BULGAN, IPOH"}, clear=False):
            filtered = MODULE.filter_cities_by_env(cities)

        self.assertEqual(filtered, [{"city_id": "BULGAN"}, {"city_id": "IPOH"}])

    def test_filter_months_by_env_keeps_requested_year_months_only(self):
        months = [
            {"year_month": "2026-03"},
            {"year_month": "2026-04"},
            {"year_month": "2026-05"},
        ]

        with patch.dict(MODULE.os.environ, {"YEAR_MONTHS": "2026-04,2026-05"}, clear=False):
            filtered = MODULE.filter_months_by_env(months)

        self.assertEqual(
            filtered,
            [{"year_month": "2026-04"}, {"year_month": "2026-05"}],
        )

    def test_load_checkpoint_returns_done_when_scope_date_matches(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            checkpoint_path = Path(tmp_dir) / "checkpoint.json"
            checkpoint_path.write_text(
                json.dumps(
                    {
                        "date": "2026-03-19",
                        "done": ["TOKYO:2026-03", "OSAKA:2026-04"],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            with (
                patch.object(MODULE, "CHECKPOINT_PATH", checkpoint_path),
                patch.object(MODULE, "get_checkpoint_scope_date", return_value="2026-03-19"),
            ):
                loaded = MODULE.load_checkpoint()

        self.assertEqual(loaded, {"TOKYO:2026-03", "OSAKA:2026-04"})

    def test_load_checkpoint_ignores_done_when_scope_date_is_stale(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            checkpoint_path = Path(tmp_dir) / "checkpoint.json"
            checkpoint_path.write_text(
                json.dumps(
                    {
                        "date": "2026-03-12",
                        "done": ["TOKYO:2026-03"],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            with (
                patch.object(MODULE, "CHECKPOINT_PATH", checkpoint_path),
                patch.object(MODULE, "get_checkpoint_scope_date", return_value="2026-03-19"),
            ):
                loaded = MODULE.load_checkpoint()

        self.assertEqual(loaded, set())

    def test_save_checkpoint_persists_scope_date(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            checkpoint_path = Path(tmp_dir) / "checkpoint.json"

            with (
                patch.object(MODULE, "CHECKPOINT_PATH", checkpoint_path),
                patch.object(MODULE, "get_checkpoint_scope_date", return_value="2026-03-19"),
            ):
                MODULE.save_checkpoint({"TOKYO:2026-03"})

            saved = json.loads(checkpoint_path.read_text(encoding="utf-8"))

        self.assertEqual(saved["date"], "2026-03-19")
        self.assertEqual(saved["done"], ["TOKYO:2026-03"])


class FakeLocator:
    def __init__(
        self,
        *,
        count=1,
        click_raises=False,
        input_value_text="",
        inner_text_value="",
        attributes=None,
    ):
        self._count = count
        self._click_raises = click_raises
        self._input_value_text = input_value_text
        self._inner_text_value = inner_text_value
        self._attributes = attributes or {}

    @property
    def first(self):
        return self

    async def wait_for(self, state=None, timeout=None):
        if self._count == 0:
            raise RuntimeError("not found")

    async def click(self, force=False):
        if self._click_raises or self._count == 0:
            raise RuntimeError("click failed")

    async def count(self):
        return self._count

    async def input_value(self):
        return self._input_value_text

    async def inner_text(self):
        return self._inner_text_value

    async def get_attribute(self, name):
        return self._attributes.get(name)


class FakeMouse:
    def __init__(self):
        self.clicks = []

    async def click(self, x, y):
        self.clicks.append((x, y))


class FakeKeyboard:
    def __init__(self, *, fail_press=False):
        self.fail_press = fail_press
        self.presses = []

    async def press(self, key):
        self.presses.append(key)
        if self.fail_press:
            raise RuntimeError("keyboard press failed")


class FakeMonthPage:
    def __init__(self, month_name):
        self.month_name = month_name
        self.mouse = FakeMouse()

    async def wait_for_selector(self, selector, timeout=None):
        if selector == 'div[jsname="S55YWb"]':
            return
        raise RuntimeError(f"missing selector: {selector}")

    def locator(self, selector):
        if selector == 'div[jsname="S55YWb"]':
            return FakeLocator()
        if selector == f'button:has-text("{self.month_name}")':
            return FakeLocator()
        if selector in {
            'button[jsname="McfNlf"]',
            'button:has-text("확인")',
            'button:has-text("Done")',
            'button:has-text("완료")',
        }:
            return FakeLocator(count=0)
        return FakeLocator(count=0)

    def get_by_role(self, role, name=None):
        if role == "tab" and name == "유연한 일정":
            return FakeLocator()
        return FakeLocator(count=0)


class FakeDestinationPage:
    def __init__(self):
        self.keyboard = FakeKeyboard(fail_press=True)

    def locator(self, selector):
        return FakeLocator()


class FakeSetupPage:
    def __init__(self):
        self._locators = {
            'input[aria-label="출발지가 어디인가요?"]': FakeLocator(
                input_value_text="대한민국 대구 TAE"
            ),
            'div[jsname="S55YWb"]': FakeLocator(inner_text_value="2026년 4월"),
        }

    def locator(self, selector):
        return self._locators.get(selector, FakeLocator(count=0))


class GoogleFlightScraperAsyncBehaviorTest(unittest.IsolatedAsyncioTestCase):
    async def test_return_to_explore_ready_skips_back_when_session_is_already_ready(self):
        with (
            patch.object(MODULE, "explore_session_ready", return_value=True),
            patch.object(MODULE, "go_back_to_explore", side_effect=AssertionError("go_back should not run")),
        ):
            result = await MODULE.return_to_explore_ready(object(), "3월")

        self.assertTrue(result)

    async def test_wait_for_async_condition_returns_true_when_predicate_flips(self):
        state = {"calls": 0}

        async def predicate():
            state["calls"] += 1
            return state["calls"] >= 3

        result = await MODULE.wait_for_async_condition(
            predicate,
            timeout_ms=60,
            interval_ms=1,
        )

        self.assertTrue(result)
        self.assertEqual(state["calls"], 3)

    async def test_wait_for_async_condition_times_out_when_predicate_never_true(self):
        async def predicate():
            return False

        result = await MODULE.wait_for_async_condition(
            predicate,
            timeout_ms=5,
            interval_ms=1,
        )

        self.assertFalse(result)

    async def test_run_month_with_retry_retries_only_failed_city_months(self):
        month = {
            "month_name": "3M",
            "year_month": "2026-03",
            "event_time": "2026-03-01",
        }
        cities = [
            {"city_id": "TOKYO", "city_name_kr": "TOKYO"},
            {"city_id": "OSAKA", "city_name_kr": "OSAKA"},
            {"city_id": "FUKUOKA", "city_name_kr": "FUKUOKA"},
        ]
        first_failures = [
            {"city_id": "OSAKA", "year_month": "2026-03", "reason": "destination_select_failed"},
            {"city_id": "FUKUOKA", "year_month": "2026-03", "reason": "no_flights"},
        ]
        calls = []

        async def fake_run_month_session(**kwargs):
            calls.append([city["city_id"] for city in kwargs["cities"]])
            if len(calls) == 1:
                return list(first_failures)
            return []

        with patch.object(MODULE, "run_month_session", side_effect=fake_run_month_session):
            failures = await MODULE.run_month_with_retry(
                context=object(),
                month=month,
                cities=cities,
                done_keys={"TOKYO:2026-03", "OSAKA:2026-03", "FUKUOKA:2026-03"},
                jsonl_path=Path("dummy.jsonl"),
                failed_path=Path("dummy_failed.json"),
                ingest_time="2026-03-18T10:00:00",
            )

        self.assertEqual(calls, [["TOKYO", "OSAKA", "FUKUOKA"], ["OSAKA", "FUKUOKA"]])
        self.assertEqual(failures, [])

    async def test_run_deferred_retry_pass_retries_failed_months_after_main_pass(self):
        months = [
            {"month_name": "3M", "year_month": "2026-03", "event_time": "2026-03-01"},
            {"month_name": "4M", "year_month": "2026-04", "event_time": "2026-04-01"},
        ]
        cities = [
            {"city_id": "TOKYO", "city_name_kr": "TOKYO"},
            {"city_id": "OSAKA", "city_name_kr": "OSAKA"},
            {"city_id": "BULGAN", "city_name_kr": "BULGAN"},
        ]
        failed_entries = [
            {"city_id": "OSAKA", "year_month": "2026-03", "reason": "destination_select_failed"},
            {"city_id": "BULGAN", "year_month": "2026-04", "reason": "destination_select_failed"},
            {"city_id": "TOKYO", "year_month": "2026-04", "reason": "no_flights"},
        ]
        calls = []

        async def fake_run_month_session(**kwargs):
            calls.append(
                (
                    kwargs["month"]["year_month"],
                    [city["city_id"] for city in kwargs["cities"]],
                )
            )
            return []

        with patch.object(MODULE, "run_month_session", side_effect=fake_run_month_session):
            remaining = await MODULE.run_deferred_retry_pass(
                context=object(),
                months=months,
                cities=cities,
                failed_entries=failed_entries,
                done_keys=set(),
                jsonl_path=Path("dummy.jsonl"),
                failed_path=Path("dummy_failed.json"),
                ingest_time="2026-03-18T10:00:00",
            )

        self.assertEqual(
            calls,
            [
                ("2026-03", ["OSAKA"]),
                ("2026-04", ["TOKYO", "BULGAN"]),
            ],
        )
        self.assertEqual(remaining, [])

    async def test_capture_setup_state_reads_origin_and_date_controls(self):
        page = FakeSetupPage()

        with patch.object(MODULE, "origin_context_is_icn", return_value=False):
            snapshot = await MODULE.capture_setup_state(page, "3월")

        self.assertEqual(snapshot["origin_input"], "대한민국 대구 TAE")
        self.assertEqual(snapshot["date_control_text"], "2026년 4월")
        self.assertFalse(snapshot["origin_is_icn"])
        self.assertFalse(snapshot["month_applied"])

    async def test_scrape_city_month_requests_session_reset_when_back_loses_origin(
        self,
    ):
        city = {
            "city_id": "TOKYO",
            "city_name_kr": "도쿄",
            "country_kr": "일본",
            "primary_airport": "NRT",
        }
        month = {
            "month_name": "3월",
            "year_month": "2026-03",
            "event_time": "2026-03-01",
        }

        with (
            patch.object(MODULE, "set_destination", return_value=True),
            patch.object(MODULE, "verify_destination_page", return_value=True),
            patch.object(
                MODULE,
                "extract_flights",
                return_value=[
                    {"stops_text": "직항", "duration_text": "2시간"},
                    {"stops_text": "직항", "duration_text": "2시간 10분"},
                    {"stops_text": "직항", "duration_text": "2시간 20분"},
                ],
            ),
            patch.object(MODULE, "extract_hotel_price", return_value=100000),
            patch.object(
                MODULE,
                "extract_season_info",
                return_value={
                    "peak_season_months_raw": "N/A",
                    "peak_season_months_list": "N/A",
                    "off_season_months_raw": "N/A",
                    "off_season_months_list": "N/A",
                },
            ),
            patch.object(MODULE, "go_back_to_explore", return_value=True),
            patch.object(MODULE, "origin_context_is_icn", return_value=False),
            patch.object(MODULE, "actual_origin_input_is_icn", return_value=False),
        ):
            (
                record,
                failure_reason,
                needs_session_reset,
            ) = await MODULE.scrape_city_month(
                page=object(),
                city=city,
                month=month,
                ingest_time="2026-03-10T10:00:00",
                is_first=False,
            )

        self.assertIsNotNone(record)
        self.assertIsNone(failure_reason)
        self.assertTrue(needs_session_reset)

    async def test_select_month_flexible_returns_false_without_confirm(self):
        async def no_sleep(_seconds):
            return None

        page = FakeMonthPage("3월")

        with patch.object(MODULE.asyncio, "sleep", new=no_sleep):
            result = await MODULE.select_month_flexible(page, "3월")

        self.assertFalse(result)
        self.assertEqual(page.mouse.clicks, [(1100, 850)])

    async def test_select_month_flexible_accepts_visible_month_without_confirm(self):
        async def no_sleep(_seconds):
            return None

        page = FakeMonthPage("3월")

        with (
            patch.object(MODULE.asyncio, "sleep", new=no_sleep),
            patch.object(MODULE, "selected_month_looks_applied", return_value=True),
        ):
            result = await MODULE.select_month_flexible(page, "3월")

        self.assertTrue(result)

    async def test_set_origin_icn_requires_actual_input_value(self):
        page = FakeDestinationPage()

        with (
            patch.object(MODULE, "origin_context_is_icn", return_value=True),
            patch.object(MODULE, "get_input_value", return_value="대한민국 대구 TAE"),
            patch.object(MODULE, "wait_for_any", return_value=None),
        ):
            result = await MODULE.set_origin_icn(page)

        self.assertFalse(result)

    async def test_set_destination_uses_visible_options_when_owned_list_is_empty(self):
        async def no_sleep(_seconds):
            return None

        city = {
            "city_id": "HALONG",
            "city_name_kr": "하롱",
            "country_kr": "베트남",
            "primary_airport": "VDO",
        }
        page = FakeDestinationPage()

        async def dismiss_origin_dialog(_page):
            return None

        with (
            patch.object(MODULE.asyncio, "sleep", new=no_sleep),
            patch.object(MODULE, "dismiss_origin_dialog", new=dismiss_origin_dialog),
            patch.object(
                MODULE,
                "wait_for_any",
                return_value='input[aria-label="목적지가 어디인가요?"][aria-expanded="true"]',
            ),
            patch.object(MODULE, "focus_and_clear", return_value=True),
            patch.object(MODULE, "get_result_signature", return_value="before"),
            patch.object(MODULE, "set_input_text", return_value=True),
            patch.object(MODULE, "get_input_value", return_value=""),
            patch.object(MODULE, "collect_owned_option_texts", return_value=[]),
            patch.object(
                MODULE,
                "collect_visible_option_texts",
                return_value=["베트남 하롱 VDO"],
            ),
            patch.object(MODULE, "click_owned_option_by_text", return_value=False),
            patch.object(MODULE, "click_option_by_text", return_value=True),
            patch.object(MODULE, "wait_for_result_refresh", return_value=True),
        ):
            result = await MODULE.set_destination(page, city)

        self.assertTrue(result)

    async def test_set_destination_accepts_valid_input_when_refresh_stays_stale(self):
        async def no_sleep(_seconds):
            return None

        city = {
            "city_id": "BULGAN",
            "city_name_kr": "불간",
            "country_kr": "몽골",
            "primary_airport": "UGA",
        }
        page = FakeDestinationPage()
        page.keyboard = FakeKeyboard()

        async def dismiss_origin_dialog(_page):
            return None

        with (
            patch.object(MODULE.asyncio, "sleep", new=no_sleep),
            patch.object(MODULE, "dismiss_origin_dialog", new=dismiss_origin_dialog),
            patch.object(
                MODULE,
                "wait_for_any",
                return_value='input[aria-label="목적지가 어디인가요?"][aria-expanded="true"]',
            ),
            patch.object(MODULE, "focus_and_clear", return_value=True),
            patch.object(MODULE, "get_result_signature", return_value="before"),
            patch.object(MODULE, "set_input_text", return_value=True),
            patch.object(
                MODULE,
                "get_input_value",
                side_effect=["", "몽골 불간 UBN"],
            ),
            patch.object(
                MODULE,
                "collect_destination_option_texts",
                return_value=["몽골 불간 UBN"],
            ),
            patch.object(MODULE, "click_owned_option_by_text", return_value=False),
            patch.object(MODULE, "click_option_by_text", return_value=True),
            patch.object(MODULE, "wait_for_result_refresh", return_value=False),
        ):
            result = await MODULE.set_destination(page, city)

        self.assertTrue(result)

    async def test_set_destination_fails_fast_when_no_options_found(self):
        async def no_sleep(_seconds):
            return None

        city = {
            "city_id": "IPOH",
            "city_name_kr": "이포",
            "country_kr": "말레이시아",
            "primary_airport": "IPH",
        }
        page = FakeDestinationPage()
        page.keyboard = FakeKeyboard()

        async def dismiss_origin_dialog(_page):
            return None

        with (
            patch.object(MODULE.asyncio, "sleep", new=no_sleep),
            patch.object(MODULE, "dismiss_origin_dialog", new=dismiss_origin_dialog),
            patch.object(
                MODULE,
                "wait_for_any",
                return_value='input[aria-label="목적지가 어디인가요?"][aria-expanded="true"]',
            ),
            patch.object(MODULE, "focus_and_clear", return_value=True),
            patch.object(MODULE, "get_result_signature", return_value="before"),
            patch.object(MODULE, "set_input_text", return_value=True),
            patch.object(MODULE, "get_input_value", return_value="AGRA"),
            patch.object(MODULE, "collect_destination_option_texts", return_value=[]),
            patch.object(MODULE, "wait_for_result_refresh", return_value=False),
        ):
            result = await MODULE.set_destination(page, city)

        self.assertFalse(result)
        self.assertEqual(page.keyboard.presses, ["Escape"])

    async def test_set_destination_allows_special_city_query_without_options(self):
        async def no_sleep(_seconds):
            return None

        city = {
            "city_id": "AGRA",
            "city_name_kr": "아그라",
            "country_kr": "인도",
            "primary_airport": "AGR",
        }
        page = FakeDestinationPage()
        page.keyboard = FakeKeyboard()

        async def dismiss_origin_dialog(_page):
            return None

        with (
            patch.object(MODULE.asyncio, "sleep", new=no_sleep),
            patch.object(MODULE, "dismiss_origin_dialog", new=dismiss_origin_dialog),
            patch.object(
                MODULE,
                "wait_for_any",
                return_value='input[aria-label="목적지가 어디인가요?"][aria-expanded="true"]',
            ),
            patch.object(MODULE, "focus_and_clear", return_value=True),
            patch.object(MODULE, "get_result_signature", return_value="before"),
            patch.object(MODULE, "set_input_text", return_value=True),
            patch.object(MODULE, "get_input_value", return_value="아그라 인도"),
            patch.object(MODULE, "collect_destination_option_texts", return_value=[]),
            patch.object(MODULE, "wait_for_result_refresh", return_value=True),
        ):
            result = await MODULE.set_destination(page, city)

        self.assertTrue(result)
        self.assertEqual(page.keyboard.presses, ["Enter"])

    async def test_set_destination_tries_route_city_code_after_primary_airport(self):
        async def no_sleep(_seconds):
            return None

        city = {
            "city_id": "BULGAN",
            "city_name_kr": "불간",
            "country_kr": "몽골",
            "primary_airport": "UGA",
            "routes": [
                {"trip_city": "uln", "airport": "UGA", "trip_airport": "uga"},
                {"trip_city": "uln", "airport": "UBN", "trip_airport": "ubn"},
            ],
        }
        page = FakeDestinationPage()
        typed_terms = []
        current_term = {"value": ""}

        async def dismiss_origin_dialog(_page):
            return None

        async def fake_set_input_text(_locator, text):
            typed_terms.append(text)
            current_term["value"] = text
            return True

        async def fake_collect_destination_option_texts(_page, _locator):
            if current_term["value"] == "ULN":
                return ["몽골 불간 UBN"]
            return []

        with (
            patch.object(MODULE.asyncio, "sleep", new=no_sleep),
            patch.object(MODULE, "dismiss_origin_dialog", new=dismiss_origin_dialog),
            patch.object(
                MODULE,
                "wait_for_any",
                return_value='input[aria-label="목적지가 어디인가요?"][aria-expanded="true"]',
            ),
            patch.object(MODULE, "focus_and_clear", return_value=True),
            patch.object(MODULE, "get_result_signature", return_value="before"),
            patch.object(MODULE, "set_input_text", new=fake_set_input_text),
            patch.object(MODULE, "get_input_value", return_value=""),
            patch.object(
                MODULE,
                "collect_destination_option_texts",
                new=fake_collect_destination_option_texts,
            ),
            patch.object(MODULE, "click_owned_option_by_text", return_value=False),
            patch.object(MODULE, "click_option_by_text", return_value=True),
            patch.object(MODULE, "wait_for_result_refresh", return_value=True),
        ):
            result = await MODULE.set_destination(page, city)

        self.assertTrue(result)
        self.assertIn("ULN", typed_terms)

    async def test_set_destination_bails_out_after_valid_option_click_never_refreshes(self):
        async def no_sleep(_seconds):
            return None

        city = {
            "city_id": "AGRA",
            "city_name_kr": "아그라",
            "country_kr": "인도",
            "primary_airport": "AGR",
            "routes": [
                {"trip_city": "agra", "airport": "AGR", "trip_airport": "agr"},
                {"trip_city": "delhi", "airport": "DEL", "trip_airport": "del"},
            ],
        }
        page = FakeDestinationPage()
        page.keyboard = FakeKeyboard()
        typed_terms = []

        async def dismiss_origin_dialog(_page):
            return None

        async def fake_set_input_text(_locator, text):
            typed_terms.append(text)
            return True

        with (
            patch.object(MODULE.asyncio, "sleep", new=no_sleep),
            patch.object(MODULE, "dismiss_origin_dialog", new=dismiss_origin_dialog),
            patch.object(
                MODULE,
                "wait_for_any",
                return_value='input[aria-label="목적지가 어디인가요?"][aria-expanded="true"]',
            ),
            patch.object(MODULE, "focus_and_clear", return_value=True),
            patch.object(MODULE, "get_result_signature", return_value="before"),
            patch.object(MODULE, "set_input_text", new=fake_set_input_text),
            patch.object(MODULE, "get_input_value", return_value=""),
            patch.object(
                MODULE,
                "collect_destination_option_texts",
                return_value=["Agra Airport AGR"],
            ),
            patch.object(MODULE, "click_owned_option_by_text", return_value=False),
            patch.object(MODULE, "click_option_by_text", return_value=True),
            patch.object(MODULE, "wait_for_result_refresh", return_value=False),
            patch.object(MODULE, "actual_destination_input_matches", return_value=False),
        ):
            result = await MODULE.set_destination(page, city)

        self.assertFalse(result)
        self.assertEqual(typed_terms, ["아그라 인도"])

    async def test_extract_hotel_price_returns_half_of_detected_price(self):
        async def no_sleep(_seconds):
            return None

        class FakeMouse:
            async def wheel(self, _x, _y):
                return None

        class FakeHotelPage:
            def __init__(self):
                self.mouse = FakeMouse()

            async def inner_text(self, _selector):
                return "숙박 정보\n₩ 260,000"

        with patch.object(MODULE.asyncio, "sleep", new=no_sleep):
            hotel_price = await MODULE.extract_hotel_price(FakeHotelPage())

        self.assertEqual(hotel_price, 130000)


if __name__ == "__main__":
    unittest.main()
