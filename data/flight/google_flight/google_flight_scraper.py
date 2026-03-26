"""
Google Flight 월별 여행 프로필 크롤러 (재구축 v1)

수집 대상: Google Travel Explore 기준 도시 x 월 단위 데이터
출발지: ICN (인천)
수집 범위: 실행 시 기준 향후 6개월
저장 형식: JSONL (Bronze schema_version=3)

실행:
    python google_flight_scraper.py

환경변수:
    IGNORE_CHECKPOINT=1  : 체크포인트 무시하고 전체 재수집
    MAX_CITIES=N         : 수집할 도시 수 제한 (디버깅용)
    HEADLESS=1           : 헤드리스 모드 활성화
"""

import asyncio
import json
import os
import re
import sys
import traceback
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

from playwright.async_api import async_playwright, Page

# ──────────────────────────────────────────
# 경로 설정
# ──────────────────────────────────────────

BASE_DIR = Path(__file__).parent
MAPPING_PATH = BASE_DIR.parent / "trip_com" / "city_airport_mapping.json"
CHECKPOINT_PATH = BASE_DIR / "checkpoint.json"
BRONZE_BASE = BASE_DIR / "bronze_airticket"

# ──────────────────────────────────────────
# 상수
# ──────────────────────────────────────────

ORIGIN_AIRPORT = "ICN"
EXPLORE_URL = "https://www.google.com/travel/explore?q=인천+출발+전세계&hl=ko"
TRIP_LENGTH_DAYS = 7
DEBUG_SEARCH = os.environ.get("DEBUG_SEARCH", "0") == "1"
SPECIAL_CITY_QUERY_TERMS = {
    "AGRA": ["아그라 인도"],
    "NEW_YORK": ["New York", "New York City"],
}


def get_browser_slow_mo(headless: bool) -> int:
    raw = os.environ.get("GOOGLE_FLIGHT_SLOW_MO_MS", "").strip()
    if raw:
        try:
            return max(0, int(raw))
        except ValueError:
            pass
    return 0


def get_result_refresh_timeout_ms() -> int:
    raw = os.environ.get("GOOGLE_FLIGHT_RESULT_REFRESH_TIMEOUT_MS", "").strip()
    if raw:
        try:
            return max(200, int(raw))
        except ValueError:
            pass
    return 2500


def build_browser_launch_kwargs(headless: bool, slow_mo: int) -> dict:
    kwargs = {
        "headless": headless,
        "slow_mo": slow_mo,
        "args": [
            "--incognito",
            "--disable-geolocation",
        ],
    }
    browser_channel = os.environ.get("GOOGLE_FLIGHT_BROWSER_CHANNEL", "").strip()
    executable_path = os.environ.get("GOOGLE_FLIGHT_BROWSER_EXECUTABLE", "").strip()

    if executable_path:
        kwargs["executable_path"] = executable_path
    elif browser_channel:
        kwargs["channel"] = browser_channel

    return kwargs

# ──────────────────────────────────────────
# 도시 목록 빌드
# ──────────────────────────────────────────


def build_city_list(mapping_path: Path) -> list[dict]:
    """
    city_airport_mapping.json 읽어 Google Explore 검색용 도시 목록을 반환.
    한 도시에 공항이 여러 개여도 city_id 기준으로 1건만 사용.
    primary_airport: Google Explore 검색 fallback에 사용할 대표 공항 코드
    returns: [{"city_id": str, "city_name_kr": str, "country_kr": str, "primary_airport": str, "routes": list}, ...]
    """
    with open(mapping_path, encoding="utf-8") as f:
        mapping = json.load(f)

    seen = set()
    cities = []
    for item in mapping:
        city_id = item.get("city_code", "").strip()
        city_name_kr = item.get("city_name_kr", "").strip()
        city_name_en = item.get("city_name_en", "").strip()
        country_kr = item.get("country_kr", "").strip()
        country_en = item.get("country_en", "").strip()
        routes = item.get("routes", [])
        # 대표 공항 코드: routes의 첫 번째 airport
        primary_airport = routes[0]["airport"] if routes else ""
        if city_id and city_id not in seen:
            seen.add(city_id)
            cities.append(
                {
                    "city_id": city_id,
                    "city_name_kr": city_name_kr,
                    "city_name_en": city_name_en,
                    "country_kr": country_kr,
                    "country_en": country_en,
                    "primary_airport": primary_airport,
                    "routes": routes,
                }
            )
    return cities


def parse_env_csv(name: str) -> list[str]:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return []
    return [item.strip().upper() for item in raw.split(",") if item.strip()]


def filter_cities_by_env(cities: list[dict]) -> list[dict]:
    requested_city_ids = set(parse_env_csv("CITY_IDS"))
    if not requested_city_ids:
        return cities
    return [city for city in cities if city.get("city_id", "").strip().upper() in requested_city_ids]


def filter_months_by_env(months: list[dict]) -> list[dict]:
    requested_year_months = set(parse_env_csv("YEAR_MONTHS"))
    if not requested_year_months:
        return months
    return [month for month in months if month.get("year_month", "").strip().upper() in requested_year_months]


def debug_log(message: str) -> None:
    if DEBUG_SEARCH:
        print(message)


async def wait_for_async_condition(
    predicate,
    timeout_ms: int = 2000,
    interval_ms: int = 100,
) -> bool:
    interval_ms = max(1, interval_ms)
    attempts = max(1, timeout_ms // interval_ms)

    for _ in range(attempts):
        if await predicate():
            return True
        await asyncio.sleep(interval_ms / 1000)

    return await predicate()


def configure_console_utf8(stdout=None, stderr=None) -> bool:
    stdout = stdout or sys.stdout
    stderr = stderr or sys.stderr
    changed = False

    for stream in (stdout, stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if not callable(reconfigure):
            continue
        reconfigure(encoding="utf-8", errors="replace")
        changed = True

    return changed


configure_console_utf8()


# ──────────────────────────────────────────
# 수집 대상 월 계산
# ──────────────────────────────────────────


def get_target_months(n: int = 6) -> list[dict]:
    """
    실행 시점 기준 향후 n개월 목록 반환.
    returns: [{"month_name": "3월", "year_month": "2026-03", "event_time": "2026-03-01"}, ...]
    """
    now = datetime.now()
    result = []
    for i in range(n):
        # 당월부터 시작하여 +i개월
        month_dt = (now.replace(day=1) + timedelta(days=32 * i)).replace(day=1)
        result.append(
            {
                "month_name": f"{month_dt.month}월",
                "year_month": month_dt.strftime("%Y-%m"),
                "event_time": month_dt.strftime("%Y-%m-01"),
            }
        )
    return result


# ──────────────────────────────────────────
# 체크포인트
# ──────────────────────────────────────────


def get_checkpoint_scope_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def load_checkpoint() -> set:
    """완료된 city_id:year_month 키 세트 반환"""
    if os.environ.get("IGNORE_CHECKPOINT") == "1":
        return set()
    if not CHECKPOINT_PATH.exists():
        return set()
    try:
        data = json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
        scope_date = data.get("date")
        expected_scope_date = get_checkpoint_scope_date()
        if scope_date != expected_scope_date:
            print(
                f"[Checkpoint] Ignoring stale checkpoint date={scope_date!r}; "
                f"expected {expected_scope_date!r}."
            )
            return set()
        done = set(data.get("done", []))
        print(f"[Checkpoint] Loaded {len(done)} completed keys.")
        return done
    except Exception as e:
        print(f"[Checkpoint] Load failed: {e}")
        return set()


def save_checkpoint(done: set) -> None:
    data = {
        "date": get_checkpoint_scope_date(),
        "done": sorted(done),
    }
    CHECKPOINT_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ──────────────────────────────────────────
# 파싱 유틸
# ──────────────────────────────────────────


def parse_season_months(text: str) -> str:
    """'8월~10월 및 12월' → '8,9,10,12'"""
    months = set()
    for m in re.finditer(r"(\d+)월\s*[~～]\s*(\d+)월", text):
        start, end = int(m.group(1)), int(m.group(2))
        if start <= end:
            months.update(range(start, end + 1))
        else:
            months.update(range(start, 13))
            months.update(range(1, end + 1))
    for m in re.finditer(r"(\d+)월", text):
        months.add(int(m.group(1)))
    return ",".join(str(m) for m in sorted(months)) if months else "N/A"


def normalize_match_text(text: str) -> str:
    return re.sub(r"[^0-9A-Za-z가-힣]+", "", text or "").upper()


def is_valid_origin_value(text: str) -> bool:
    raw = text or ""
    norm = normalize_match_text(raw)
    has_icn_signal = (
        "ICN" in norm
        or "인천국제공항" in raw
        or "인천" in raw
        or "SEOUL" in norm
        or "서울" in raw
    )
    has_wrong_signal = "대구" in raw or "TAE" in norm
    return has_icn_signal and not has_wrong_signal


def pick_best_origin_option(option_texts: list[str]) -> str | None:
    best_text = None
    best_score = 0

    for text in option_texts:
        raw = text or ""
        norm = normalize_match_text(raw)
        score = 0
        if "ICN" in norm:
            score += 100
        if "인천국제공항" in raw:
            score += 80
        if "인천" in raw:
            score += 50
        if "SEOUL" in norm or "서울" in raw:
            score += 15
        if "대구" in raw or "TAE" in norm:
            score -= 200

        if score > best_score:
            best_text = raw
            best_score = score

    if best_text and is_valid_origin_value(best_text):
        return best_text
    return None


def score_destination_text(text: str, city: dict) -> int:
    raw = text or ""
    norm = normalize_match_text(raw)
    score = 0

    city_name_kr = city.get("city_name_kr", "")
    city_id = city.get("city_id", "")
    primary_airport = city.get("primary_airport", "")
    country_kr = city.get("country_kr", "")
    route_airports = {
        normalize_match_text(route.get("airport", ""))
        for route in city.get("routes", [])
        if route.get("airport")
    }
    route_trip_cities = {
        normalize_match_text(route.get("trip_city", ""))
        for route in city.get("routes", [])
        if route.get("trip_city")
    }

    if city_name_kr and city_name_kr in raw:
        score += 80
    if city_id and normalize_match_text(city_id) in norm:
        score += 50
    if primary_airport and normalize_match_text(primary_airport) in norm:
        score += 70
    if route_airports and any(alias in norm for alias in route_airports):
        score += 40
    if route_trip_cities and any(alias in norm for alias in route_trip_cities):
        score += 20
    if country_kr and country_kr in raw:
        score += 10

    return score


def pick_best_destination_option(option_texts: list[str], city: dict) -> str | None:
    best_text = None
    best_score = 0

    for text in option_texts:
        score = score_destination_text(text, city)
        if score > best_score:
            best_text = text
            best_score = score

    return best_text if best_text and best_score > 0 else None


def destination_looks_valid(text: str, city: dict) -> bool:
    return score_destination_text(text, city) >= 50


def build_destination_search_terms(city: dict) -> list[str]:
    terms: list[str] = []
    seen: set[str] = set()

    def add_term(value: str | None) -> None:
        if not value:
            return
        term = value.strip()
        if not term or term in seen:
            return
        seen.add(term)
        terms.append(term)

    for special_term in SPECIAL_CITY_QUERY_TERMS.get(city.get("city_id", ""), []):
        add_term(special_term)

    add_term(city.get("city_name_kr"))
    add_term(city.get("city_id"))
    add_term(city.get("primary_airport"))

    for route in city.get("routes", []):
        add_term(route.get("airport"))

    for route in city.get("routes", []):
        trip_city = route.get("trip_city")
        if trip_city:
            add_term(trip_city.upper())

    if city.get("city_name_kr") and city.get("country_kr"):
        add_term(f"{city['city_name_kr']} {city['country_kr']}")

    return terms


def allow_query_without_options(city: dict, current_value: str) -> bool:
    city_id = city.get("city_id", "")
    if city_id not in SPECIAL_CITY_QUERY_TERMS:
        return False
    return destination_looks_valid(current_value, city)


def make_failed_entry(city: dict, month: dict, reason: str) -> dict:
    return {
        "city_id": city["city_id"],
        "city_name_kr": city["city_name_kr"],
        "year_month": month["year_month"],
        "stage": "scrape_city_month",
        "reason": reason,
    }


def parse_duration_minutes(text: str) -> int | None:
    """'2시간 30분' → 150 / '45분' → 45 / None if unparse"""
    h_match = re.search(r"(\d+)시간", text)
    m_match = re.search(r"(\d+)분", text)
    if not h_match and not m_match:
        return None
    hours = int(h_match.group(1)) if h_match else 0
    minutes = int(m_match.group(1)) if m_match else 0
    return hours * 60 + minutes


def minutes_to_text(minutes: int) -> str:
    """150 → '2시간 30분'"""
    h, m = divmod(minutes, 60)
    if h > 0 and m > 0:
        return f"{h}시간 {m}분"
    elif h > 0:
        return f"{h}시간"
    else:
        return f"{m}분"


def stops_text_to_count(text: str) -> int:
    """'직항' → 0 / '경유 1회' → 1 / '1회 경유' → 1 / else → -1"""
    if "직항" in text:
        return 0
    m = re.search(r"(\d+)회", text)
    if m:
        return int(m.group(1))
    return -1


def compute_min_duration_and_stops(flights: list[dict]) -> tuple[int, str, int, str]:
    """상위 3개 항공편 중 최소 비행시간을 구하고, 해당 항공편의 경유 횟수를 반환."""
    valid_flights = []
    for f in flights:
        dur_text = f.get("duration_text", "N/A")
        stops_text = f.get("stops_text", "N/A")
        if dur_text == "N/A":
            continue
        m = parse_duration_minutes(dur_text)
        if m is not None:
            valid_flights.append((m, dur_text, stops_text))

    if not valid_flights:
        return 0, "N/A", -1, "N/A"

    best = min(valid_flights, key=lambda x: x[0])
    min_minutes, min_dur_text, stops_text = best
    return min_minutes, min_dur_text, stops_text_to_count(stops_text), stops_text


def parse_hotel_price_krw(text: str) -> int | None:
    """'₩ 186,000' → 186000"""
    cleaned = re.sub(r"[₩\s,]", "", text)
    if re.fullmatch(r"\d+", cleaned):
        return int(cleaned)
    return None


# ──────────────────────────────────────────
# JSONL 저장
# ──────────────────────────────────────────


def make_jsonl_record(
    city: dict,
    month: dict,
    payload: dict,
    ingest_time: str,
) -> dict:
    return {
        "dataset": "airticket",
        "schema_version": 3,
        "source": "google_flights",
        "ingest_time": ingest_time,
        "event_time": month["event_time"],
        "entity": {
            "city_id": city["city_id"],
            "city_name": city.get("city_name_en", city["city_name_kr"]),
            "country": city.get("country_en", city.get("country_kr", "")),
            "origin_airport": ORIGIN_AIRPORT,
            "target_month": month["month_name"],
            "year_month": month["year_month"],
            "route_type": "explore_monthly_snapshot",
        },
        "payload": payload,
    }


def get_output_paths(ingest_time: str) -> tuple[Path, Path]:
    """
    ingest_time: "2026-03-09T10:00:00"
    returns: (jsonl_path, failed_path)
    """
    dt = datetime.fromisoformat(ingest_time)
    out_dir = (
        BRONZE_BASE
        / "google_flights"
        / f"dt={dt.strftime('%Y-%m-%d')}"
        / f"hour={dt.strftime('%H')}"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = out_dir / "all_cities.jsonl"
    failed_path = out_dir / "failed_destinations.json"
    return jsonl_path, failed_path


def append_jsonl(path: Path, record: dict) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def save_failed(path: Path, entries: list[dict]) -> None:
    path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")


# ──────────────────────────────────────────
# Playwright 헬퍼
# ──────────────────────────────────────────


async def wait_for_any(
    page: Page, selectors: list[str], timeout: int = 8000
) -> str | None:
    """주어진 셀렉터 중 먼저 나타나는 것 반환"""
    for sel in selectors:
        try:
            await page.wait_for_selector(sel, timeout=timeout // len(selectors))
            return sel
        except Exception:
            continue
    return None


async def safe_click(page: Page, selector: str, force: bool = False) -> bool:
    try:
        el = page.locator(selector).first
        await el.wait_for(state="visible", timeout=5000)
        await el.click(force=force)
        return True
    except Exception:
        return False


async def focus_and_clear(page: Page, selector: str) -> bool:
    try:
        locator = page.locator(selector).first
        await locator.wait_for(state="visible", timeout=6000)
        await locator.click(force=True)
        await asyncio.sleep(0.1)
        await locator.press("Control+A")
        await locator.press("Backspace")
        await asyncio.sleep(0.2)
        return True
    except Exception:
        return False


async def type_slowly(page: Page, text: str, delay: int = 80) -> None:
    for char in text:
        await page.keyboard.type(char, delay=delay)


async def set_input_text(locator, text: str) -> bool:
    try:
        if hasattr(locator, 'press_sequentially'):
            await locator.press_sequentially(text, delay=150)
        else:
            await locator.type(text, delay=150)
            
        val = await locator.input_value()
        if val.strip():
            return True
            
        return False
    except Exception:
        return False

    try:
        return bool((await locator.input_value()).strip())
    except Exception:
        return False


async def collect_visible_option_texts(page: Page) -> list[str]:
    selectors = ['[role="option"]', 'ul[role="listbox"] li']
    texts: list[str] = []
    seen: set[str] = set()

    for sel in selectors:
        locator = page.locator(sel)
        try:
            count = await locator.count()
        except Exception:
            continue

        for idx in range(min(count, 20)):
            item = locator.nth(idx)
            try:
                if not await item.is_visible():
                    continue
                text = (await item.inner_text()).strip()
            except Exception:
                continue
            if not text or text in seen:
                continue
            seen.add(text)
            texts.append(text)

    return texts


async def collect_owned_option_texts(locator) -> list[str]:
    try:
        owns = await locator.get_attribute("aria-owns")
    except Exception:
        return []

    if not owns:
        return []

    listbox = locator.page.locator(f"#{owns}")
    option_locator = listbox.locator('[role="option"]')
    texts: list[str] = []
    seen: set[str] = set()

    try:
        count = await option_locator.count()
    except Exception:
        return []

    for idx in range(min(count, 20)):
        item = option_locator.nth(idx)
        try:
            text = (await item.inner_text()).strip()
        except Exception:
            continue
        if not text or text in seen:
            continue
        seen.add(text)
        texts.append(text)

    return texts


async def collect_destination_option_texts(page: Page, locator) -> list[str]:
    seen: set[str] = set()

    for attempt in range(3):
        texts: list[str] = []

        for candidate in await collect_owned_option_texts(locator):
            if candidate and candidate not in seen:
                seen.add(candidate)
                texts.append(candidate)

        for candidate in await collect_visible_option_texts(page):
            if candidate and candidate not in seen:
                seen.add(candidate)
                texts.append(candidate)

        if texts:
            return texts

        if attempt < 2:
            await asyncio.sleep(0.4)

    return []


async def click_owned_option_by_text(locator, target_text: str) -> bool:
    try:
        owns = await locator.get_attribute("aria-owns")
    except Exception:
        return False

    if not owns:
        return False

    option_locator = locator.page.locator(f"#{owns}").locator('[role="option"]')
    try:
        count = await option_locator.count()
    except Exception:
        return False

    for exact in (True, False):
        for idx in range(min(count, 20)):
            item = option_locator.nth(idx)
            try:
                text = (await item.inner_text()).strip()
            except Exception:
                continue
            matched = text == target_text if exact else target_text in text
            if not matched:
                continue
            try:
                await item.click(force=True)
                return True
            except Exception:
                continue
    return False


async def click_option_by_text(page: Page, target_text: str) -> bool:
    selectors = ['[role="option"]', 'ul[role="listbox"] li']
    for exact in (True, False):
        for sel in selectors:
            locator = page.locator(sel)
            try:
                count = await locator.count()
            except Exception:
                continue

            for idx in range(min(count, 20)):
                item = locator.nth(idx)
                try:
                    if not await item.is_visible():
                        continue
                    text = (await item.inner_text()).strip()
                except Exception:
                    continue

                matched = text == target_text if exact else target_text in text
                if not matched:
                    continue

                try:
                    await item.click(force=True)
                    return True
                except Exception:
                    continue
    return False


async def get_input_value(page: Page, selectors: list[str]) -> str:
    for sel in selectors:
        locator = page.locator(sel).first
        try:
            if await locator.count() == 0:
                continue
            return (await locator.input_value()).strip()
        except Exception:
            continue
    return ""


async def actual_destination_input_matches(page: Page, city: dict) -> bool:
    current_value = await get_input_value(
        page,
        [
            'input[aria-label="목적지가 어디인가요?"]',
            'input[aria-label*="목적지"]',
            'input[placeholder*="목적지"]',
        ],
    )
    return destination_looks_valid(current_value, city)


async def actual_origin_input_is_icn(page: Page) -> bool:
    current_value = await get_input_value(
        page,
        [
            'input[aria-label="출발지가 어디인가요?"]',
            'input[aria-label*="출발지"]',
            'input[placeholder*="출발지"]',
        ],
    )
    return is_valid_origin_value(current_value)


async def origin_context_is_icn(page: Page) -> bool:
    try:
        title = await page.title()
    except Exception:
        title = ""

    if is_valid_origin_value(title):
        return True

    current_value = await get_input_value(
        page,
        [
            'input[aria-label="출발지가 어디인가요?"]',
            'input[aria-label*="출발지"]',
            'input[placeholder*="출발지"]',
        ],
    )
    if is_valid_origin_value(current_value):
        return True

    try:
        page_text = await page.inner_text("body")
    except Exception:
        page_text = ""

    return "인천 출발" in page_text or "서울 인천" in page_text


async def selected_month_looks_applied(page: Page, month_name: str) -> bool | None:
    selectors = [
        'div[jsname="S55YWb"]',
        'button[jsname="S55YWb"]',
        '[aria-label*="날짜"]',
        "div.k0XDHb",
    ]
    saw_signal = False

    for sel in selectors:
        locator = page.locator(sel).first
        try:
            if await locator.count() == 0:
                continue
        except Exception:
            continue

        texts: list[str] = []
        for getter in (locator.inner_text, locator.input_value):
            try:
                value = await getter()
            except Exception:
                continue
            if value and value.strip():
                texts.append(value.strip())

        for attr in ("aria-label", "placeholder", "value"):
            try:
                value = await locator.get_attribute(attr)
            except Exception:
                continue
            if value and value.strip():
                texts.append(value.strip())

        if not texts:
            continue

        saw_signal = True
        if any(month_name in text for text in texts):
            return True

    if saw_signal:
        return False
    return None


async def read_date_control_text(page: Page) -> str:
    selectors = [
        'div[jsname="S55YWb"]',
        'button[jsname="S55YWb"]',
        '[aria-label*="날짜"]',
        "div.k0XDHb",
    ]

    for sel in selectors:
        locator = page.locator(sel).first
        try:
            if await locator.count() == 0:
                continue
        except Exception:
            continue

        for getter in (locator.inner_text, locator.input_value):
            try:
                value = await getter()
            except Exception:
                continue
            if value and value.strip():
                return value.strip()

        for attr in ("aria-label", "placeholder", "value"):
            try:
                value = await locator.get_attribute(attr)
            except Exception:
                continue
            if value and value.strip():
                return value.strip()

    return ""


async def capture_setup_state(page: Page, month_name: str) -> dict[str, object]:
    origin_input = await get_input_value(
        page,
        [
            'input[aria-label="출발지가 어디인가요?"]',
            'input[aria-label*="출발지"]',
            'input[placeholder*="출발지"]',
        ],
    )
    date_control_text = await read_date_control_text(page)
    month_applied = await selected_month_looks_applied(page, month_name)
    origin_is_icn = await actual_origin_input_is_icn(page)
    return {
        "origin_input": origin_input,
        "date_control_text": date_control_text,
        "month_applied": month_applied,
        "origin_is_icn": origin_is_icn,
    }


def format_setup_state(snapshot: dict[str, object]) -> str:
    origin_input = snapshot.get("origin_input") or "<empty>"
    date_control_text = snapshot.get("date_control_text") or "<empty>"
    month_applied = snapshot.get("month_applied")
    origin_is_icn = snapshot.get("origin_is_icn")
    return (
        f"origin_input={origin_input!r} | "
        f"date_control={date_control_text!r} | "
        f"month_applied={month_applied} | "
        f"origin_is_icn={origin_is_icn}"
    )


async def explore_session_ready(page: Page, month_name: str) -> bool:
    # If a back button is visible, we are on a destination detail page, so we are not ready.
    back_selectors = [
        'button[aria-label="뒤로 이동"]:visible',
        'button[aria-label="뒤로"]:visible',
        'button[aria-label*="Back"]:visible',
        'button[aria-label*="back"]:visible',
    ]
    for sel in back_selectors:
        try:
            if await page.locator(sel).count() > 0:
                return False
        except Exception:
            pass

    if not await actual_origin_input_is_icn(page):
        return False

    month_applied = await selected_month_looks_applied(page, month_name)
    return month_applied is not False


async def return_to_explore_ready(page: Page, month_name: str) -> bool:
    if await explore_session_ready(page, month_name):
        return True

    back_ok = await go_back_to_explore(page)
    if not back_ok:
        return False

    if await explore_session_ready(page, month_name):
        return True

    print(f"  [session] Explore recovered but session context drifted for {month_name}")
    return False


async def dismiss_origin_dialog(page: Page) -> None:
    for _ in range(3):
        try:
            dialog_input = page.locator(
                'input[aria-label="추가할 출발지가 있나요?"]'
            ).first
            if await dialog_input.count() == 0:
                return
            if not await dialog_input.is_visible():
                return
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.4)
        except Exception:
            return


async def wait_for_result_refresh(
    page: Page, previous_signature: str, timeout_ms: int | None = None
) -> bool:
    timeout_ms = timeout_ms or get_result_refresh_timeout_ms()
    iterations = max(1, timeout_ms // 250)
    for _ in range(iterations):
        await asyncio.sleep(0.25)
        current_signature = await get_result_signature(page)
        if current_signature and current_signature != previous_signature:
            return True
    return False


async def get_result_signature(page: Page) -> str:
    selectors = ['li[jsname="W6gdT"]', 'div[jsname="W6gdT"]', ".mz975d"]
    for sel in selectors:
        locator = page.locator(sel).first
        try:
            if await locator.count() == 0:
                continue
            text = (await locator.inner_text()).strip()
            if text:
                return text
        except Exception:
            continue
    return ""


async def select_month_flexible(page: Page, month_name: str) -> bool:
    """
    Google Explore의 날짜 버튼 클릭 → 유연한 일정 탭 → 월 선택 → 확인
    """
    # 날짜 버튼 클릭
    date_btn_selectors = [
        'div[jsname="S55YWb"]',
        'button[jsname="S55YWb"]',
        '[aria-label*="날짜"]',
        "div.k0XDHb",
    ]
    clicked = False
    for sel in date_btn_selectors:
        try:
            await page.wait_for_selector(sel, timeout=5000)
            await page.locator(sel).first.click()
            clicked = True
            break
        except Exception:
            continue

    if not clicked:
        return False

    await wait_for_any(
        page,
        [
            f'button:has-text("{month_name}")',
            f'[aria-label*="{month_name}"]',
            '[role="tab"]',
        ],
        timeout=1500,
    )

    # 유연한 일정 탭 클릭 (없어도 진행)
    try:
        tab_clicked = False
        for tab_name in ["날짜 변경 가능", "유연한 일정"]:
            flexible_tab = page.get_by_role("tab", name=tab_name)
            if await flexible_tab.count() > 0:
                await flexible_tab.first.click()
                await wait_for_any(
                    page,
                    [
                        f'button:has-text("{month_name}")',
                        f'[aria-label*="{month_name}"]',
                    ],
                    timeout=1000,
                )
                tab_clicked = True
                break
    except Exception:
        pass

    # 월 버튼 클릭 — .first로 단일 요소만 처리
    month_clicked = False
    try:
        btn = page.locator(f'button:has-text("{month_name}"):visible').first
        await btn.wait_for(state="visible", timeout=4000)
        await btn.click()
        month_clicked = True
    except Exception:
        pass

    if not month_clicked:
        try:
            btn = page.locator(f'[aria-label*="{month_name}"]:visible').first
            await btn.wait_for(state="visible", timeout=3000)
            await btn.click()
            month_clicked = True
        except Exception:
            pass

    if not month_clicked:
        return False


    # 확인 버튼 클릭 — .first로 단일 요소만 클릭
    confirm_clicked = False
    for sel in [
        'button[jsname="McfNlf"]',
        'button:has-text("확인")',
        'button:has-text("Done")',
        'button:has-text("완료")',
    ]:
        try:
            btn = page.locator(sel).first
            await btn.wait_for(state="visible", timeout=3000)
            await btn.click(force=True)
            confirm_clicked = True
            break
        except Exception:
            continue

    if not confirm_clicked:
        # fallback: 좌표 클릭
        try:
            await page.mouse.click(1100, 850)
        except Exception:
            pass
        return await wait_for_async_condition(
            lambda: selected_month_looks_applied(page, month_name),
            timeout_ms=1200,
            interval_ms=100,
        )

    await wait_for_async_condition(
        lambda: selected_month_looks_applied(page, month_name),
        timeout_ms=1500,
        interval_ms=100,
    )
    return await selected_month_looks_applied(page, month_name) is not False


async def set_origin_icn(page: Page) -> bool:
    """출발지를 인천(ICN)으로 정확히 설정"""
    opener_selectors = [
        'input[aria-label="출발지가 어디인가요?"]',
        'input[aria-label*="출발지"]',
        'input[placeholder*="출발지"]',
    ]
    dialog_input_selectors = [
        'input[aria-label="추가할 출발지가 있나요?"]',
        'input[aria-label*="출발지가 있나요"]',
    ]
    search_terms = ["ICN", "인천국제공항", "인천"]

    if await actual_origin_input_is_icn(page):
        await dismiss_origin_dialog(page)
        return True

    for opener_sel in opener_selectors:
        try:
            opener = page.locator(opener_sel).first
            await opener.wait_for(state="visible", timeout=5000)
            await opener.click(force=True)
        except Exception:
            continue

        dialog_sel = await wait_for_any(page, dialog_input_selectors, timeout=6000)
        if not dialog_sel:
            continue
        debug_log(f"    [set_origin] opener={opener_sel} dialog={dialog_sel}")

        for search_term in search_terms:
            if not await focus_and_clear(page, dialog_sel):
                continue

            try:
                dialog_input = page.locator(dialog_sel).first
                typed = await set_input_text(dialog_input, search_term)
                if not typed:
                    await type_slowly(page, search_term)
                await asyncio.sleep(0.3)
                current_value = await get_input_value(page, opener_selectors)
                debug_log(
                    f"    [set_origin] term={search_term} typed_value={current_value}"
                )

                option_texts = await collect_visible_option_texts(page)
                best_option = pick_best_origin_option(option_texts)
                debug_log(
                    f"    [set_origin] options={option_texts[:5]} best_option={best_option}"
                )
                if best_option:
                    clicked = await click_option_by_text(page, best_option)
                    debug_log(f"    [set_origin] clicked={clicked}")
                    if not clicked:
                        continue
                else:
                    await page.keyboard.press("ArrowDown")
                    await asyncio.sleep(0.3)
                    await page.keyboard.press("Enter")
                    debug_log("    [set_origin] fallback=ArrowDown+Enter")

                await dismiss_origin_dialog(page)
                if await wait_for_async_condition(
                    lambda: actual_origin_input_is_icn(page),
                    timeout_ms=1200,
                    interval_ms=100,
                ):
                    return True

                final_value = await get_input_value(page, opener_selectors)
                debug_log(
                    f"    [set_origin] context still not ICN after term={search_term} final_value={final_value}"
                )
            except Exception:
                continue

    return False


async def set_destination(page: Page, city: dict) -> bool:
    """
    목적지를 아래 순서로 검색:
    1. city_name_kr (한글명)
    2. city_id (영문 코드)
    3. primary_airport (공항 코드)
    """
    dest_selectors = [
        'input[aria-label="목적지가 어디인가요?"]',
        'input[aria-label*="목적지"]',
        'input[placeholder*="목적지"]',
    ]
    search_terms = build_destination_search_terms(city)

    await dismiss_origin_dialog(page)

    opener_selectors = [
        'input[aria-label="목적지가 어디인가요?"][aria-expanded="false"]',
        'input[aria-label="목적지가 어디인가요?"]',
        'input[aria-label*="목적지"]',
        'input[placeholder*="목적지"]',
    ]
    dialog_selectors = [
        'input[aria-label="목적지가 어디인가요?"][aria-expanded="true"]',
        'input[placeholder="목적지가 어디인가요?"][aria-expanded="true"]',
    ]

    for opener_sel in opener_selectors:
        debug_log(f"    [set_dest] Trying opener: {opener_sel}")
        try:
            opener = page.locator(opener_sel).first
            debug_log(f"    [set_dest] Waiting for opener to be visible...")
            await opener.wait_for(state="visible", timeout=4000)
            debug_log(f"    [set_dest] Opener visible. Clicking...")
            await opener.click(force=True)
            debug_log(f"    [set_dest] Opener clicked successfully.")
            break
        except Exception as e:
            debug_log(f"    [set_dest] Opener {opener_sel} failed: {e}")
            continue
    else:
        debug_log("    [set_dest] Could not open destination dialog")
        # 팝업이 이미 열려있을 수도 있으니 확인해본다.
        dialog_sel_check = await wait_for_any(page, dialog_selectors, timeout=2000)
        if not dialog_sel_check:
            return False
        debug_log("    [set_dest] Actually, dialog was already open!")

    debug_log(f"    [set_dest] Waiting for dialog to appear...")
    dialog_sel = await wait_for_any(page, dialog_selectors, timeout=4000)
    if not dialog_sel:
        debug_log("    [set_dest] Dialog did not appear")
        return False
    debug_log(f"    [set_dest] Dialog is ready using selector: {dialog_sel}")

    for search_term in search_terms:
        try:
            if not await focus_and_clear(page, dialog_sel):
                continue
            previous_signature = await get_result_signature(page)
            debug_log(f"    [set_dest] term={search_term} selector={dialog_sel}")
            locator = page.locator(dialog_sel).first
            if DEBUG_SEARCH:
                try:
                    meta = await locator.evaluate(
                        """el => ({
                            tag: el.tagName,
                            type: el.getAttribute('type'),
                            role: el.getAttribute('role'),
                            aria: el.getAttribute('aria-label'),
                            placeholder: el.getAttribute('placeholder'),
                            readonly: el.readOnly,
                            disabled: el.disabled,
                            value: el.value
                        })"""
                    )
                    editable = await locator.is_editable()
                    debug_log(f"    [set_dest] meta={meta} editable={editable}")
                except Exception as exc:
                    debug_log(f"    [set_dest] meta_error={exc}")
            filled = await set_input_text(locator, search_term)
            if not filled:
                await type_slowly(page, search_term)
            await asyncio.sleep(0.3)
            current_value = await get_input_value(page, dest_selectors)
            debug_log(f"    [set_dest] typed_value={current_value}")
            option_texts = await collect_destination_option_texts(page, locator)
            debug_log(f"    [set_dest] options={option_texts[:5]}")
            best_option = pick_best_destination_option(option_texts, city)
            debug_log(f"    [set_dest] best_option={best_option}")
            if not best_option:
                if not option_texts:
                    if allow_query_without_options(city, current_value):
                        await page.keyboard.press("Enter")
                        refreshed = await wait_for_result_refresh(
                            page, previous_signature
                        )
                        debug_log(
                            f"    [set_dest] special_enter_refresh={refreshed}"
                        )
                        if refreshed or await actual_destination_input_matches(
                            page, city
                        ):
                            return True
                    debug_log("    [set_dest] no options found; skipping term")
                    continue
                debug_log(f"    [set_dest] current_value={current_value}")
                if destination_looks_valid(current_value, city):
                    await page.keyboard.press("Enter")
                    refreshed = await wait_for_result_refresh(
                        page, previous_signature
                    )
                    debug_log(f"    [set_dest] enter_refresh={refreshed}")
                    if refreshed:
                        return True
                try:
                    await page.keyboard.press("ArrowDown")
                    await asyncio.sleep(0.3)
                    await page.keyboard.press("Enter")
                    refreshed = await wait_for_result_refresh(
                        page, previous_signature
                    )
                    debug_log(f"    [set_dest] arrowdown_refresh={refreshed}")
                    if refreshed:
                        return True
                except Exception:
                    pass
                continue

            clicked = await click_owned_option_by_text(locator, best_option)
            if not clicked:
                clicked = await click_option_by_text(page, best_option)
            debug_log(f"    [set_dest] clicked={clicked}")
            if not clicked:
                continue

            refreshed = await wait_for_result_refresh(page, previous_signature)
            debug_log(f"    [set_dest] option_refresh={refreshed}")
            if not refreshed:
                if await actual_destination_input_matches(page, city):
                    return True
                await page.keyboard.press("Enter")
                refreshed = await wait_for_result_refresh(page, previous_signature)
                debug_log(f"    [set_dest] enter_refresh_after_click={refreshed}")
                if not refreshed:
                    if await actual_destination_input_matches(page, city):
                        return True
                    debug_log(
                        "    [set_dest] valid option click never refreshed; bailing out early"
                    )
                    try:
                        await page.keyboard.press("Escape")
                    except Exception:
                        pass
                    return False

            if destination_looks_valid(best_option, city):
                if search_term != city["city_name_kr"]:
                    print(
                        f"    [set_dest] '{city['city_name_kr']}' matched via '{search_term}'"
                    )
                return True
        except Exception:
            continue

    try:
        await page.keyboard.press("Escape")
    except Exception:
        pass
    return False


async def extract_trip_dates(page: Page) -> str:
    """여행 날짜 범위 추출"""
    try:
        page_text = await page.inner_text("body")
        date_match = re.search(
            r"(\d{1,2}월\s*\d{1,2}일\s*[-~]\s*(?:\d{1,2}월\s*)?\d{1,2}일)", page_text
        )
        if date_match:
            return date_match.group(1).strip()
    except Exception:
        pass
    return "N/A"


async def extract_flights(page: Page) -> list[dict]:
    """
    상위 3개 항공편에서 stops_text, duration_text 추출.
    저장 대상: stops, duration만 (항공사명, 가격, 공항쌍 제외)
    """
    results = []
    # 항공편 카드 셀렉터 (fallback 포함)
    card_selectors = [
        'div[jsname="W6gdT"]',
        'li[jsname="W6gdT"]',
        ".mz975d",
    ]
    flights = []
    for sel in card_selectors:
        try:
            flights = await page.query_selector_all(sel)
            if flights:
                break
        except Exception:
            continue

    for f in flights[:3]:
        try:
            flight_text = await f.inner_text()
        except Exception:
            results.append({"stops_text": "N/A", "duration_text": "N/A"})
            continue

        # 경유 정보
        stops_match = re.search(r"(직항|\d+회\s*경유|경유\s*\d+회)", flight_text)
        stops_text = stops_match.group(1).strip() if stops_match else "N/A"

        # 비행 시간 — 첫 번째 숫자+시간 패턴
        dur_match = re.search(r"(\d+시간(?:\s*\d+분)?|\d+분)", flight_text)
        duration_text = dur_match.group(1).strip() if dur_match else "N/A"

        results.append({"stops_text": stops_text, "duration_text": duration_text})

    # 3개 미만이면 N/A로 채움
    while len(results) < 3:
        results.append({"stops_text": "N/A", "duration_text": "N/A"})

    return results


async def extract_hotel_price(page: Page) -> int | None:
    """숙박 대표 가격 추출 (원화 정수)"""
    try:
        # 스크롤해서 숙박 섹션 노출
        await page.mouse.wheel(0, 400)
        
        matches = []
        for _ in range(15):
            await asyncio.sleep(0.3)
            page_text = await page.inner_text("body")
            matches = re.findall(r"숙박\s*정보.{0,100}?(₩\s*[\d,]+)", page_text, re.DOTALL)
            if matches:
                break
                
        if matches:
            parsed_price = parse_hotel_price_krw(matches[-1])
            return parsed_price // 2 if parsed_price is not None else None
    except Exception:
        pass
    return None


async def extract_season_info(page: Page) -> dict:
    """성수기/비성수기 월 텍스트 추출"""
    result = {
        "peak_season_months_raw": "N/A",
        "peak_season_months_list": "N/A",
        "off_season_months_raw": "N/A",
        "off_season_months_list": "N/A",
    }
    try:
        peak_el = page.locator(
            'xpath=//div[normalize-space(text())="성수기"]/following-sibling::div[1]'
        )
        if await peak_el.count() > 0:
            text = (await peak_el.first.inner_text()).strip()
            if re.search(r"\d+월", text):
                result["peak_season_months_raw"] = text
                result["peak_season_months_list"] = parse_season_months(text)
    except Exception:
        pass
    try:
        off_el = page.locator(
            'xpath=//div[normalize-space(text())="비성수기"]/following-sibling::div[1]'
        )
        if await off_el.count() > 0:
            text = (await off_el.first.inner_text()).strip()
            if re.search(r"\d+월", text):
                result["off_season_months_raw"] = text
                result["off_season_months_list"] = parse_season_months(text)
    except Exception:
        pass
    return result


async def go_back_to_explore(page: Page) -> bool:
    """
    목적지 상세 화면에서 Explore 메인으로 복귀.
    returns: True if successfully returned to explore page
    """
    back_selectors = [
        'button[aria-label="뒤로 이동"]:visible',
        'button[aria-label="뒤로"]:visible',
        'button[aria-label*="Back"]:visible',
        'button[aria-label*="back"]:visible',
    ]
    for sel in back_selectors:
        try:
            btn = page.locator(sel).first
            if await btn.count() > 0:
                await btn.click(force=True)
                break
        except Exception:
            continue
    else:
        # fallback: 브라우저 뒤로가기
        try:
            await page.go_back()
        except Exception:
            pass

    # 탐색 페이지 복귀 확인 (목적지 입력창 노출 여부)
    dest_input_selectors = [
        'input[aria-label="목적지가 어디인가요?"]',
        'input[aria-label*="목적지"]',
    ]
    for sel in dest_input_selectors:
        try:
            await page.wait_for_selector(sel, timeout=4000)
            return True
        except Exception:
            continue

    # 복귀 실패 → URL 강제 재이동
    print("  [go_back] Explore not detected, navigating back to URL...")
    try:
        await page.goto(EXPLORE_URL, wait_until="domcontentloaded", timeout=40000)
        return False  # 월/출발지 재설정이 필요함을 알림
    except Exception as e:
        print(f"  [go_back] URL fallback also failed: {e}")
        return False


# ──────────────────────────────────────────
# 도시 x 월 스크래핑 (1 페이지 세션)
# ──────────────────────────────────────────


async def verify_destination_page(page: Page, city: dict) -> bool:
    """
    현재 페이지가 해당 목적지로 갱신되었는지 확인.
    항공편 카드가 노출되고, 본문 또는 입력값이 해당 도시와 매칭되는지 확인.
    """
    if not await get_result_signature(page):
        return False

    dest_value = await get_input_value(
        page,
        [
            'input[aria-label="목적지가 어디인가요?"]',
            'input[aria-label*="목적지"]',
            'input[placeholder*="목적지"]',
        ],
    )
    if destination_looks_valid(dest_value, city):
        return True

    try:
        page_text = await page.inner_text("body")
    except Exception:
        page_text = ""

    return destination_looks_valid(page_text, city)


async def scrape_city_month(
    page: Page,
    city: dict,
    month: dict,
    ingest_time: str,
    is_first: bool,
) -> tuple[dict | None, str | None, bool]:
    """
    현재 page에서 도시×월 데이터 수집.
    returns: (record, failure_reason, session_reset_required)
    """
    label = f"{city['city_id']}({city['city_name_kr']}):{month['year_month']}"
    try:
        # 목적지 설정
        ok = await set_destination(page, city)
        if not ok:
            print(f"  [{label}] WARN: set_destination failed.")
            back_ok = await return_to_explore_ready(page, month["month_name"])
            return None, "destination_select_failed", not back_ok

        # 해당 도시 페이지 진입 여부 확인
        on_city_page = await verify_destination_page(page, city)
        if not on_city_page:
            print(f"  [{label}] WARN: Destination page not detected, skipping.")
            back_ok = await return_to_explore_ready(page, month["month_name"])
            return None, "destination_not_verified", not back_ok

        # 항공편 추출
        flights = await extract_flights(page)
        has_flights = any(f["stops_text"] != "N/A" for f in flights)
        if not has_flights:
            print(f"  [{label}] No flights found, skipping.")
            back_ok = await return_to_explore_ready(page, month["month_name"])
            return None, "no_flights", not back_ok

        hotel_price = await extract_hotel_price(page)
        season_info = await extract_season_info(page)

        # 요약값 계산
        min_minutes, min_dur_text, min_stops_count, min_stops_text = compute_min_duration_and_stops(flights)

        payload = {
            "trip_length_days": TRIP_LENGTH_DAYS,
            "trip_dates": "N/A",
            "hotel_price": hotel_price,
            "flight_1_stops_text": flights[0]["stops_text"],
            "flight_1_duration_text": flights[0]["duration_text"],
            "flight_2_stops_text": flights[1]["stops_text"],
            "flight_2_duration_text": flights[1]["duration_text"],
            "flight_3_stops_text": flights[2]["stops_text"],
            "flight_3_duration_text": flights[2]["duration_text"],
            "typical_stops_count": min_stops_count,
            "typical_stops_text": min_stops_text,
            "min_duration_minutes": min_minutes,
            "min_duration_text": min_dur_text,
            **season_info,
            "collected_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        record = make_jsonl_record(city, month, payload, ingest_time)

        print(
            f"  [{label}] OK | hotel={hotel_price} | stops={min_stops_text} | dur={min_dur_text}"
        )

        back_ok = await return_to_explore_ready(page, month["month_name"])
        if not back_ok:
            # Explore 복귀 실패 → 월/출발지 재설정 필요 신호
            print(f"  [{label}] WARN: go_back failed — session may need reset")

        return record, None, not back_ok

    except Exception as e:
        print(f"  [{label}] ERROR: {e}")
        try:
            back_ok = await return_to_explore_ready(page, month["month_name"])
        except Exception:
            back_ok = False
        return None, "unexpected_error", not back_ok


# ──────────────────────────────────────────
# 월별 세션 (1 페이지 = 1 월)
# ──────────────────────────────────────────


async def run_month_session(
    context,
    month: dict,
    cities: list[dict],
    done_keys: set,
    jsonl_path: Path,
    failed_path: Path,
    ingest_time: str,
) -> list[dict]:
    """
    주어진 월에 대해 모든 도시를 순서대로 크롤링.
    returns: 실패 항목 목록
    """
    page = await context.new_page()
    failed_entries = []

    month_name = month["month_name"]
    print(f"\n[Month] === {month_name} ({month['year_month']}) ===")

    try:

        async def setup_month_origin(setup_label: str) -> bool:
            try:
                await page.goto(
                    EXPLORE_URL, wait_until="domcontentloaded", timeout=60000
                )
            except Exception as e:
                print(f"  [{setup_label}] WARN: goto EXPLORE_URL failed: {e}")
                return False

            month_ok = await select_month_flexible(page, month_name)
            month_snapshot = await capture_setup_state(page, month_name)
            print(
                f"  [{setup_label}] month snapshot: {format_setup_state(month_snapshot)}"
            )
            if not month_ok:
                print(f"  [{setup_label}] WARN: failed to select {month_name}")
                return False

            origin_ok = await set_origin_icn(page)
            origin_snapshot = await capture_setup_state(page, month_name)
            print(
                f"  [{setup_label}] origin snapshot: {format_setup_state(origin_snapshot)}"
            )
            if not origin_ok:
                print(
                    f"  [{setup_label}] WARN: failed to set origin ICN for {month_name}"
                )
                return False

            return True

        initial_setup_ok = await setup_month_origin("Month")
        if not initial_setup_ok:
            for city in cities:
                ck = f"{city['city_id']}:{month['year_month']}"
                if ck in done_keys:
                    continue
                failed_entries.append(
                    make_failed_entry(city, month, "month_setup_failed")
                )
            return failed_entries

        # 세션 상태 추적: go_back이 False → URL 재이동됐으므로 월/출발지 재설정 필요
        needs_session_reset = False

        async def restore_session() -> bool:
            """기존 페이지를 닫고 새 페이지(창)를 열어서 봇 감지/세션 꼬임 완전 초기화"""
            nonlocal page
            try:
                await page.close()
            except Exception:
                pass
            await asyncio.sleep(1.0)
            page = await context.new_page()
            return await setup_month_origin("Session")

        for idx, city in enumerate(cities):
            ck = f"{city['city_id']}:{month['year_month']}"
            if ck in done_keys:
                print(f"  [Skip] {ck}")
                continue

            # 세션이 리셋된 경우(URL 재이동 후) 월/출발지 재설정
            if needs_session_reset:
                print(f"  [Session] Restoring month/origin after URL fallback...")
                restored = await restore_session()
                if not restored:
                    for remaining_city in cities[idx:]:
                        remaining_ck = (
                            f"{remaining_city['city_id']}:{month['year_month']}"
                        )
                        if remaining_ck in done_keys:
                            continue
                        failed_entries.append(
                            make_failed_entry(
                                remaining_city, month, "session_restore_failed"
                            )
                        )
                    break
                needs_session_reset = False

            record, failure_reason, needs_session_reset = await scrape_city_month(
                page=page,
                city=city,
                month=month,
                ingest_time=ingest_time,
                is_first=False,
            )

            if record is not None:
                append_jsonl(jsonl_path, record)
                done_keys.add(ck)
            else:
                failed_entries.append(
                    make_failed_entry(city, month, failure_reason or "no_data_or_error")
                )

    except Exception as e:
        print(f"  [Month] FATAL error for {month_name}: {e}")
        traceback.print_exc()
    finally:
        await page.close()

    return failed_entries


async def run_month_with_retry(
    context,
    month: dict,
    cities: list[dict],
    done_keys: set,
    jsonl_path: Path,
    failed_path: Path,
    ingest_time: str,
) -> list[dict]:
    failed_entries = await run_month_session(
        context=context,
        month=month,
        cities=cities,
        done_keys=done_keys,
        jsonl_path=jsonl_path,
        failed_path=failed_path,
        ingest_time=ingest_time,
    )
    if not failed_entries:
        return []

    failed_city_ids = {
        entry["city_id"]
        for entry in failed_entries
        if entry.get("year_month") == month["year_month"] and entry.get("city_id")
    }
    retry_cities = [city for city in cities if city.get("city_id") in failed_city_ids]
    if not retry_cities:
        return failed_entries

    print(
        f"[Retry] {month['year_month']} retrying {len(retry_cities)} failed city-month entries"
    )
    retry_failures = await run_month_session(
        context=context,
        month=month,
        cities=retry_cities,
        done_keys=done_keys,
        jsonl_path=jsonl_path,
        failed_path=failed_path,
        ingest_time=ingest_time,
    )
    return retry_failures


async def run_deferred_retry_pass(
    context,
    months: list[dict],
    cities: list[dict],
    failed_entries: list[dict],
    done_keys: set,
    jsonl_path: Path,
    failed_path: Path,
    ingest_time: str,
) -> list[dict]:
    if not failed_entries:
        return []

    remaining_failures: list[dict] = []

    for month in months:
        failed_city_ids: list[str] = []
        seen_city_ids: set[str] = set()
        for entry in failed_entries:
            city_id = entry.get("city_id")
            if (
                entry.get("year_month") == month["year_month"]
                and city_id
                and city_id not in seen_city_ids
            ):
                seen_city_ids.add(city_id)
                failed_city_ids.append(city_id)

        if not failed_city_ids:
            continue

        retry_city_id_set = set(failed_city_ids)
        retry_cities = [
            city for city in cities if city.get("city_id") in retry_city_id_set
        ]
        if not retry_cities:
            remaining_failures.extend(
                [
                    entry
                    for entry in failed_entries
                    if entry.get("year_month") == month["year_month"]
                ]
            )
            continue

        print(
            f"[Deferred Retry] {month['year_month']} retrying "
            f"{len(retry_cities)} failed city-month entries"
        )
        retry_failures = await run_month_session(
            context=context,
            month=month,
            cities=retry_cities,
            done_keys=done_keys,
            jsonl_path=jsonl_path,
            failed_path=failed_path,
            ingest_time=ingest_time,
        )
        remaining_failures.extend(retry_failures)

    return remaining_failures


# ──────────────────────────────────────────
# 메인
# ──────────────────────────────────────────


async def main():
    # 설정
    headless = os.environ.get("HEADLESS", "0") == "1"
    max_cities_env = os.environ.get("MAX_CITIES")
    max_cities = int(max_cities_env) if max_cities_env else None

    ingest_time = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    jsonl_path, failed_path = get_output_paths(ingest_time)

    print(f"[Start] ingest_time={ingest_time}")
    print(f"[Output] {jsonl_path}")

    # 도시 목록
    cities = build_city_list(MAPPING_PATH)
    cities = filter_cities_by_env(cities)
    if max_cities:
        cities = cities[:max_cities]
    print(f"[Cities] {len(cities)} cities loaded.")

    # 수집 대상 월
    months = get_target_months(6)
    months = filter_months_by_env(months)
    print(f"[Months] {[m['year_month'] for m in months]}")

    # 체크포인트
    done_keys = load_checkpoint()

    # 실패 목록 (전체)
    initial_failed: list[dict] = []
    all_failed: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            **build_browser_launch_kwargs(
                headless=headless,
                slow_mo=get_browser_slow_mo(headless=headless),
            )
        )
        # 하나의 컨텍스트 — 월마다 새 페이지
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
        )
        # Google 로그인 팝업 차단
        await context.route(
            "**accounts.google.com/gsi/**",
            lambda route: route.abort(),
        )

        for month in months:
            failed_this_month = await run_month_session(
                context=context,
                month=month,
                cities=cities,
                done_keys=done_keys,
                jsonl_path=jsonl_path,
                failed_path=failed_path,
                ingest_time=ingest_time,
            )
            initial_failed.extend(failed_this_month)
            # 월 완료 후 체크포인트 저장
            save_checkpoint(done_keys)
            print(f"[Checkpoint] Saved after {month['year_month']}")

        all_failed = await run_deferred_retry_pass(
            context=context,
            months=months,
            cities=cities,
            failed_entries=initial_failed,
            done_keys=done_keys,
            jsonl_path=jsonl_path,
            failed_path=failed_path,
            ingest_time=ingest_time,
        )

        await context.close()
        await browser.close()

    # 최종 실패 목록 저장
    if all_failed:
        save_failed(failed_path, all_failed)
        print(f"\n[Failed] {len(all_failed)} entries saved to {failed_path}")

    total_done = sum(1 for k in done_keys if any(m["year_month"] in k for m in months))
    print(f"\n[Done] Collected {total_done} city-month records → {jsonl_path}")


if __name__ == "__main__":
    asyncio.run(main())
