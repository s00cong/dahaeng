import asyncio
import csv
import json
import os
import random
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List
from urllib.parse import parse_qs, urlparse

from playwright.async_api import Browser, Page, async_playwright

BASE_DIR = Path(__file__).resolve().parent
MAPPING_FILE = BASE_DIR / "city_airport_mapping.json"
OUTPUT_DIR = BASE_DIR / "bronze_airticket"
CHECKPOINT_FILE = BASE_DIR / "checkpoint.json"
HOME_URL = "https://kr.trip.com/flights/"

CONCURRENCY = 1
CALENDAR_PAGES = 3
NAV_TIMEOUT_MS = 60000
ZERO_RESULT_RETRY_ROUNDS = 1
MAX_ROUTE_ATTEMPTS = 3
ROUTES_PER_CONTEXT = 12
RATE_LIMIT_COOLDOWN_BASE_SEC = 20
RATE_LIMIT_COOLDOWN_JITTER_SEC = 12
GLOBAL_RATE_LIMIT_COOLDOWN_BASE_SEC = 35
GLOBAL_RATE_LIMIT_COOLDOWN_JITTER_SEC = 20
DEBUG_LOG = os.getenv("SCRAPER_DEBUG", "0") == "1"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
]

LOGIN_OVERLAY_SELECTORS = [
    "#google-login-sdk-focus-lock-container",
    "iframe[src*='accounts.google.com/gsi/iframe']",
    "iframe[title*='Google']",
    "iframe[title*='로그인']",
]

FROM_INPUT_SELECTORS = [
    "input[data-testid='search_city_from0']",
    "input[aria-label*='출발 공항 또는 도시']",
]

TO_INPUT_SELECTORS = [
    "input[data-testid='search_city_to0']",
    "input[aria-label*='도착 공항 또는 도시']",
]

FROM_WRAPPER_SELECTORS = [
    "[data-testid='search_city_from0_wrapper']",
    "div.fuzzy-input[data-testid='search_city_from0_wrapper']",
]

TO_WRAPPER_SELECTORS = [
    "[data-testid='search_city_to0_wrapper']",
    "div.fuzzy-input[data-testid='search_city_to0_wrapper']",
]

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def matches_route_filter(route: Dict, route_filter: str) -> bool:
    needles = [token.strip().lower() for token in route_filter.split(",") if token.strip()]
    if not needles:
        return True

    haystacks = [
        route.get("route_key", "").lower(),
        route.get("label", "").lower(),
        route.get("city_code", "").lower(),
        route.get("city_name_kr", "").lower(),
    ]
    return any(any(needle in haystack for haystack in haystacks) for needle in needles)


def parse_price_krw(price_text: str) -> int:
    text = (price_text or "").strip()
    if not text:
        return -1

    m = re.search(r"([\d.]+)만", text)
    if m:
        return int(float(m.group(1)) * 10000)

    m = re.search(r"[\d,]+", text)
    if m:
        return int(m.group(0).replace(",", ""))

    return -1


def parse_date_from_aria(aria_label: str) -> str:
    m = re.search(r"(\d{4})년\s+(\d{1,2})월\s+(\d{1,2})일", aria_label or "")
    if not m:
        return ""
    year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return f"{year:04d}-{month:02d}-{day:02d}"


def load_mapping() -> List[Dict]:
    with MAPPING_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_checkpoint(for_date: str) -> set:
    if not CHECKPOINT_FILE.exists():
        return set()

    try:
        with CHECKPOINT_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return set()

    if isinstance(data, dict):
        if data.get("date") != for_date:
            return set()
        items = data.get("done", [])
        return set(items) if isinstance(items, list) else set()

    if isinstance(data, list):
        # Legacy format: treat as empty by default to avoid blocking new-day runs.
        allow_legacy = os.getenv("ALLOW_LEGACY_CHECKPOINT", "0") == "1"
        if allow_legacy:
            return set(data)
        print("  [Info] legacy checkpoint format detected; ignoring (set ALLOW_LEGACY_CHECKPOINT=1 to use).")
        return set()

    return set()


def save_checkpoint(done_keys: set, for_date: str) -> None:
    payload = {"date": for_date, "done": sorted(done_keys)}
    with CHECKPOINT_FILE.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)


def build_routes(mapping: List[Dict]) -> List[Dict]:
    routes: List[Dict] = []
    for city in mapping:
        city_code = city["city_code"]
        city_name_kr = city["city_name_kr"]
        city_name_en = city.get("city_name_en", city_name_kr)
        country_kr = city["country_kr"]
        country_en = city.get("country_en", country_kr)

        for r in city["routes"]:
            airport = r["airport"].upper()
            trip_city = r["trip_city"].lower()
            trip_airport = r["trip_airport"].lower()

            routes.append(
                {
                    "route_key": f"{city_code}_{airport}_out",
                    "city_code": city_code,
                    "city_name_kr": city_name_kr,
                    "city_name_en": city_name_en,
                    "country_kr": country_kr,
                    "country_en": country_en,
                    "label": f"서울 -> {city_name_kr} ({airport})",
                    "dcity": "sel",
                    "dairport": "icn",
                    "acity": trip_city,
                    "aairport": trip_airport,
                    "dest_airport": airport,
                    "direction": "outbound",
                }
            )

            routes.append(
                {
                    "route_key": f"{city_code}_{airport}_in",
                    "city_code": city_code,
                    "city_name_kr": city_name_kr,
                    "city_name_en": city_name_en,
                    "country_kr": country_kr,
                    "country_en": country_en,
                    "label": f"{city_name_kr} ({airport}) -> 서울",
                    "dcity": trip_city,
                    "dairport": trip_airport,
                    "acity": "sel",
                    "aairport": "icn",
                    "dest_airport": airport,
                    "direction": "inbound",
                }
            )
    return routes


def report_mapping_health(mapping: List[Dict]) -> Dict:
    total = 0
    same = 0
    for city in mapping:
        for route in city["routes"]:
            total += 1
            if route.get("trip_city", "").lower() == route.get("trip_airport", "").lower():
                same += 1
    print(f"Mapping health: total routes={total}, trip_city==trip_airport={same}")
    ratio = (same / total) if total else 0.0
    if total > 0 and ratio > 0.7:
        print("  [Warn] trip_city values look unhealthy. Run rebuild_trip_city_mapping.py first.")
    return {"total": total, "same": same, "ratio": ratio}


def make_showfare_url(route: Dict, ddate: str) -> str:
    return (
        "https://kr.trip.com/flights/showfarefirst"
        f"?dcity={route['dcity']}&acity={route['acity']}"
        f"&dairport={route['dairport']}&aairport={route['aairport']}"
        f"&ddate={ddate}&triptype=ow&class=y&quantity=1&locale=ko-KR&curr=KRW"
    )


def route_params_match(url: str, route: Dict) -> bool:
    query = parse_qs(urlparse(url).query)

    def q(name: str) -> str:
        value = query.get(name, [""])[0]
        return value.lower().strip()

    # Airport binding is the hard requirement.
    # City code may be normalized by Trip (e.g., airport -> metro city code),
    # so we do not reject only by city mismatch.
    airports_ok = (
        q("dairport") == route["dairport"].lower()
        and q("aairport") == route["aairport"].lower()
    )

    if not airports_ok:
        return False

    expected_dcity = route["dcity"].lower()
    expected_acity = route["acity"].lower()
    actual_dcity = q("dcity")
    actual_acity = q("acity")
    if DEBUG_LOG and (actual_dcity != expected_dcity or actual_acity != expected_acity):
        print(
            "  [Warn] city code normalized by Trip:",
            f"expected {expected_dcity}->{expected_acity},",
            f"actual {actual_dcity}->{actual_acity}",
        )

    return True


def short_error(exc: Exception, max_len: int = 180) -> str:
    msg = str(exc).strip().splitlines()[0] if str(exc).strip() else exc.__class__.__name__
    return msg if len(msg) <= max_len else (msg[: max_len - 3] + "...")


async def is_rate_limited_page(page: Page) -> bool:
    try:
        text = await page.evaluate("() => (document.body && document.body.innerText) ? document.body.innerText : ''")
    except Exception:
        return False

    text = (text or "").lower()
    markers = [
        "죄송합니다. 시도 제한 횟수를 초과했습니다",
        "시도 제한 횟수를 초과",
        "too many attempts",
        "too many requests",
        "try again later",
        "잠시 후 다시 시도",
    ]
    return any(marker in text for marker in markers)


async def wait_rate_limit_cooldown(route_label: str, attempt: int) -> None:
    cooldown = RATE_LIMIT_COOLDOWN_BASE_SEC + random.randint(0, RATE_LIMIT_COOLDOWN_JITTER_SEC) + (attempt - 1) * 10
    print(f"  [RateLimit] {route_label} cooldown {cooldown}s then retry")
    await asyncio.sleep(cooldown)


async def wait_global_cooldown(global_rate_limit: Dict, global_rate_limit_lock: asyncio.Lock) -> None:
    while True:
        async with global_rate_limit_lock:
            remaining = global_rate_limit["until"] - time.monotonic()
        if remaining <= 0:
            return
        await asyncio.sleep(min(remaining, 3.0))


async def trigger_global_cooldown(
    route_label: str,
    global_rate_limit: Dict,
    global_rate_limit_lock: asyncio.Lock,
) -> None:
    cooldown = GLOBAL_RATE_LIMIT_COOLDOWN_BASE_SEC + random.randint(0, GLOBAL_RATE_LIMIT_COOLDOWN_JITTER_SEC)
    new_until = time.monotonic() + cooldown
    async with global_rate_limit_lock:
        if new_until > global_rate_limit["until"]:
            global_rate_limit["until"] = new_until
    print(f"  [GlobalRateLimit] {route_label} pause all workers for ~{cooldown}s")


async def neutralize_login_overlay(page: Page) -> bool:
    try:
        removed = await page.evaluate(
            """
            (selectors) => {
                let touched = false;
                for (const selector of selectors) {
                    const nodes = document.querySelectorAll(selector);
                    for (const node of nodes) {
                        touched = true;
                        node.style.setProperty('display', 'none', 'important');
                        node.style.setProperty('visibility', 'hidden', 'important');
                        node.style.setProperty('pointer-events', 'none', 'important');
                    }
                }
                return touched;
            }
            """,
            LOGIN_OVERLAY_SELECTORS,
        )
        if removed and DEBUG_LOG:
            print("  [Info] login overlay neutralized")
        return bool(removed)
    except Exception:
        return False


async def guarded_click(page: Page, selector: str) -> bool:
    locator = page.locator(selector).first
    if await locator.count() == 0:
        return False

    for _ in range(3):
        await neutralize_login_overlay(page)
        try:
            await locator.click(timeout=5000)
            return True
        except Exception:
            try:
                await locator.click(timeout=4000, force=True)
                return True
            except Exception:
                pass
            await asyncio.sleep(0.25)

    try:
        clicked = await page.evaluate(
            """
            (sel) => {
                const el = document.querySelector(sel);
                if (!el) return false;
                el.click();
                return true;
            }
            """,
            selector,
        )
        return bool(clicked)
    except Exception:
        return False


async def find_first_visible_selector(page: Page, selectors: List[str]) -> str:
    for selector in selectors:
        try:
            locator = page.locator(selector).first
            if await locator.count() == 0:
                continue
            await locator.wait_for(state="visible", timeout=1500)
            return selector
        except Exception:
            continue
    return ""


async def find_first_present_selector(page: Page, selectors: List[str]) -> str:
    for selector in selectors:
        try:
            locator = page.locator(selector).first
            if await locator.count() > 0:
                return selector
        except Exception:
            continue
    return ""


async def choose_airport_from_dropdown(page: Page, airport_code: str) -> bool:
    target = airport_code.upper()
    try:
        await page.wait_for_selector(
            ".m-flight-poi-search-B.nh_poi-container[data-testid='search_result_box'], li.poi-result__airport[data-value], #m-flight-poi-list",
            timeout=4500,
        )
    except Exception:
        pass

    try:
        result = await page.evaluate(
            """
            (code) => {
                const isVisible = (el) => {
                    const r = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
                };
                const parse = (raw) => {
                    try { return JSON.parse(raw); } catch (_) { return null; }
                };

                const hasCode = (text, codeValue) => {
                    const up = (text || '').toUpperCase();
                    return up.includes(` ${codeValue}`) || up.includes(`${codeValue} `) || up.endsWith(codeValue) || up.startsWith(codeValue);
                };

                // 1) strongest: airport child rows with data-value
                const airportRows = Array.from(document.querySelectorAll('li.poi-result__airport[data-value]'))
                    .filter(isVisible);
                let bestAirport = null;
                let bestAirportScore = -1;
                for (const row of airportRows) {
                    const raw = row.getAttribute('data-value');
                    if (!raw) continue;
                    const obj = parse(raw);
                    if (!obj) continue;
                    const airportCode = (obj.airportCode || '').toString().toUpperCase();
                    const codeField = (obj.code || '').toString().toUpperCase();
                    const text = (row.textContent || '').toUpperCase();
                    let score = 0;
                    if (airportCode === code) score += 1000;
                    if (codeField === code) score += 900;
                    if (hasCode(text, code)) score += 120;
                    if (score > bestAirportScore) {
                        bestAirport = row;
                        bestAirportScore = score;
                    }
                }
                if (bestAirport && bestAirportScore >= 900) {
                    bestAirport.click();
                    return { ok: true, score: bestAirportScore, text: (bestAirport.textContent || '').trim().slice(0, 100), mode: 'airport-row' };
                }

                // 2) fallback: direct title rows (single airport rows etc.)
                const titleRows = Array.from(document.querySelectorAll('.poi-result__title.title--new.title--able'))
                    .filter(isVisible);
                let bestTitle = null;
                let bestTitleScore = -1;
                for (const row of titleRows) {
                    const text = (row.textContent || '').trim();
                    if (!text) continue;
                    let score = 0;
                    if (hasCode(text, code)) score += 140;
                    if (/(공항|airport)/i.test(text)) score += 30;
                    if (/(모든 공항|all airports?)/i.test(text)) score -= 20;
                    if (score > bestTitleScore) {
                        bestTitle = row;
                        bestTitleScore = score;
                    }
                }
                if (bestTitle && bestTitleScore >= 100) {
                    bestTitle.click();
                    return { ok: true, score: bestTitleScore, text: (bestTitle.textContent || '').trim().slice(0, 100), mode: 'title-row' };
                }

                return { ok: false, score: -1, text: '', mode: 'none' };
            }
            """,
            target,
        )
        if result and result.get("ok"):
            if DEBUG_LOG:
                print(
                    f"  [Info] dropdown click '{target}' mode={result.get('mode')} "
                    f"score={result.get('score')} text={result.get('text')}"
                )
            return True
    except Exception:
        pass

    try:
        await page.keyboard.press("ArrowDown")
        await asyncio.sleep(0.1)
        await page.keyboard.press("Enter")
        return True
    except Exception:
        return False


async def set_location_input(
    page: Page,
    wrapper_selectors: List[str],
    input_selectors: List[str],
    airport_code: str,
    placeholder_text: str,
) -> bool:
    wrapper_selector = await find_first_visible_selector(page, wrapper_selectors)
    input_selector = await find_first_present_selector(page, input_selectors)
    if not wrapper_selector or not input_selector:
        return False

    wrapper = page.locator(wrapper_selector).first
    locator = page.locator(input_selector).first

    try:
        await wrapper.click(force=True)
        await asyncio.sleep(0.15)
        await locator.click(force=True)
        await asyncio.sleep(0.15)
        await locator.press("Control+A")
        await locator.press("Backspace")
        await locator.type(airport_code, delay=90)
    except Exception:
        try:
            await page.keyboard.press("Control+A")
            await page.keyboard.press("Backspace")
            await page.keyboard.type(airport_code, delay=90)
        except Exception:
            return False

    chosen = await choose_airport_from_dropdown(page, airport_code)
    if not chosen:
        return False

    await asyncio.sleep(0.2)
    try:
        ok = await page.evaluate(
            """
            ({inputSelector, wrapperSelector, placeholder, code}) => {
                const input = document.querySelector(inputSelector);
                const wrapper = document.querySelector(wrapperSelector);
                const value = input ? (input.value || '').trim() : '';
                const text = wrapper ? (wrapper.textContent || '').trim() : '';
                const upperCode = (code || '').toUpperCase();
                const valueUp = value.toUpperCase();
                const textUp = text.toUpperCase();
                if (value && value !== placeholder && valueUp.includes(upperCode)) return true;
                if (text && !text.includes(placeholder) && textUp.includes(upperCode)) return true;
                return false;
            }
            """,
            {
                "inputSelector": input_selector,
                "wrapperSelector": wrapper_selector,
                "placeholder": placeholder_text,
                "code": airport_code.upper(),
            },
        )
        return bool(ok)
    except Exception:
        return True


async def set_route_on_home(page: Page, route: Dict) -> bool:
    from_ok = await set_location_input(
        page,
        FROM_WRAPPER_SELECTORS,
        FROM_INPUT_SELECTORS,
        route["dairport"].upper(),
        "출발지",
    )
    await asyncio.sleep(0.2)
    to_ok = await set_location_input(
        page,
        TO_WRAPPER_SELECTORS,
        TO_INPUT_SELECTORS,
        route["aairport"].upper(),
        "도착지",
    )
    await asyncio.sleep(0.3)
    if not (from_ok and to_ok):
        print(
            f"  [Warn] route input not stable: from_ok={from_ok}, to_ok={to_ok}, "
            f"{route['dairport'].upper()} -> {route['aairport'].upper()}"
        )
    return from_ok and to_ok


async def has_route_form_values(page: Page) -> bool:
    try:
        values = await page.evaluate(
            """
            () => {
                const fromEl =
                    document.querySelector("input[data-testid='search_city_from0']") ||
                    document.querySelector("input[aria-label*='출발 공항 또는 도시']");
                const toEl =
                    document.querySelector("input[data-testid='search_city_to0']") ||
                    document.querySelector("input[aria-label*='도착 공항 또는 도시']");
                const fromVal = fromEl ? (fromEl.value || '').trim() : '';
                const toVal = toEl ? (toEl.value || '').trim() : '';
                return { fromVal, toVal };
            }
            """
        )
        return bool(values.get("fromVal")) and bool(values.get("toVal"))
    except Exception:
        return False


async def open_calendar(page: Page) -> bool:
    if await page.query_selector("div.c-calendar__body"):
        return True

    selectors = [
        "div.input-wrapper.flex[aria-label*='가는날']",
        "[aria-label*='가는날']",
        "div[aria-label*='출발']",
        "div[data-testid='search_date_wrapper']",
        "input[aria-label*='출발 공항 또는 도시']",
    ]

    for selector in selectors:
        ok = await guarded_click(page, selector)
        if ok:
            await asyncio.sleep(1.0)
            if await page.query_selector("div.c-calendar__body"):
                return True

    return await page.query_selector("div.c-calendar__body") is not None


async def ensure_calendar_open(page: Page) -> bool:
    for attempt in range(3):
        if await open_calendar(page):
            return True

        wait_sec = 1 + attempt * 2
        await asyncio.sleep(wait_sec)

        if attempt == 1:
            try:
                await page.reload(wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(1.2)
            except Exception:
                pass

        try:
            await page.evaluate("window.scrollTo(0, 300)")
        except Exception:
            pass

    return False


async def extract_calendar_cells(page: Page) -> List[Dict]:
    try:
        await page.wait_for_selector("div.c-calendar__body", timeout=25000)
    except Exception:
        return []

    data = await page.evaluate(
        """
        () => {
            const cells = document.querySelectorAll('td[role="gridcell"]');
            const result = [];

            for (const td of cells) {
                const wrapper = td.querySelector('div.tipWrapper');
                if (!wrapper) continue;

                const aria = wrapper.getAttribute('aria-label') || '';
                if (!aria.includes('가격')) continue;

                const priceSpan = td.querySelector('span.price span');
                const priceText = priceSpan ? priceSpan.textContent.trim() : '';
                result.push({ aria, priceText });
            }

            return result;
        }
        """
    )

    results: List[Dict] = []
    for item in data:
        date_str = parse_date_from_aria(item.get("aria", ""))
        if not date_str:
            continue

        price = parse_price_krw(item.get("priceText", ""))
        if price > 0:
            results.append({"date": date_str, "price": price})

    return results


async def click_next_month(page: Page, steps: int = 2) -> bool:
    moved = False
    for _ in range(steps):
        selector = "span.c-calendar-icon-next-mon:not(.is-disable)"
        if not await page.query_selector(selector):
            break
        if not await guarded_click(page, selector):
            break
        moved = True
        await asyncio.sleep(0.8)
    return moved


async def block_google_login(req_route) -> None:
    await req_route.abort()


async def create_worker_session(browser: Browser) -> Dict:
    context = await browser.new_context(
        viewport={
            "width": random.choice([1280, 1366, 1440, 1920]),
            "height": random.choice([768, 800, 900, 1080]),
        },
        user_agent=random.choice(USER_AGENTS),
    )
    await context.route("**accounts.google.com/**", block_google_login)
    await context.route("**/gsi/**", block_google_login)
    page = await context.new_page()
    return {"context": context, "page": page}


async def close_worker_session(session: Dict) -> None:
    page = session.get("page")
    context = session.get("context")
    if page:
        try:
            await page.close()
        except Exception:
            pass
    if context:
        try:
            await context.close()
        except Exception:
            pass


async def needs_calendar_recovery(page: Page, route: Dict) -> bool:
    if await is_rate_limited_page(page):
        return True

    if not route_params_match(page.url, route):
        return True

    if await page.query_selector("div.c-calendar__body"):
        return False

    return True


async def recover_route_calendar_state(
    page: Page,
    route: Dict,
    route_url: str,
    month_offset: int,
) -> bool:
    print(f"  [Recover] restoring route/calendar state (offset={month_offset})")

    for attempt in range(1, 3):
        try:
            await page.goto(route_url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
            await asyncio.sleep(random.uniform(1.0, 2.0))
            await neutralize_login_overlay(page)

            if await is_rate_limited_page(page):
                return False

            if not route_params_match(page.url, route):
                continue

            if not await ensure_calendar_open(page):
                continue

            restored = True
            for _ in range(month_offset):
                if not await click_next_month(page, steps=2):
                    restored = False
                    break

            if restored:
                print(f"  [Recover] success on try {attempt}")
                return True
        except Exception:
            pass

    print("  [Recover] failed")
    return False


def make_jsonl_record(date_str: str, price: int, route: Dict, ingest_time: str) -> Dict:
    return {
        "dataset": "airticket",
        "schema_version": 1,
        "source": "trip_com",
        "ingest_time": ingest_time,
        "event_time": date_str,
        "entity": {
            "city_code": route["city_code"],
            "city_name": route.get("city_name_en", route["city_name_kr"]),
            "city_name_kr": route["city_name_kr"],
            "city_name_en": route.get("city_name_en", route["city_name_kr"]),
            "country": route.get("country_en", route["country_kr"]),
            "country_kr": route["country_kr"],
            "country_en": route.get("country_en", route["country_kr"]),
            "origin": route["dairport"].upper(),
            "dest_airport": route["aairport"].upper(),
            "direction": route["direction"],
        },
        "payload": {
            "price": price,
            "currency": "KRW",
        },
    }


async def scrape_route(
    page: Page,
    route: Dict,
    ingest_time: str,
    global_rate_limit: Dict,
    global_rate_limit_lock: asyncio.Lock,
) -> tuple[List[Dict], bool]:
    print(f"\n  -> {route['label']}")
    ddate = datetime.now().strftime("%Y-%m-%d")
    url = make_showfare_url(route, ddate)

    for route_attempt in range(1, MAX_ROUTE_ATTEMPTS + 1):
        await wait_global_cooldown(global_rate_limit, global_rate_limit_lock)
        await asyncio.sleep(random.uniform(0.0, 0.3))

        try:
            rate_limited = False
            bound_ok = False

            for _ in range(2):
                await page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
                await asyncio.sleep(random.uniform(1.0, 2.0))
                await neutralize_login_overlay(page)

                if await is_rate_limited_page(page):
                    rate_limited = True
                    break

                if route_params_match(page.url, route):
                    bound_ok = True
                    break

            if rate_limited:
                await trigger_global_cooldown(route["label"], global_rate_limit, global_rate_limit_lock)
                if route_attempt < MAX_ROUTE_ATTEMPTS:
                    await wait_rate_limit_cooldown(route["label"], route_attempt)
                    continue
                print(f"  [Skip] rate-limited: {route['label']}")
                return [], True

            if not bound_ok:
                print(f"  [Skip] route binding mismatch: {route['label']}")
                return [], True

            if not await ensure_calendar_open(page):
                if await is_rate_limited_page(page):
                    await trigger_global_cooldown(route["label"], global_rate_limit, global_rate_limit_lock)
                    if route_attempt < MAX_ROUTE_ATTEMPTS:
                        await wait_rate_limit_cooldown(route["label"], route_attempt)
                        continue
                print(f"  [Skip] calendar open failed: {route['label']}")
                return [], True

            date_price: Dict[str, int] = {}
            month_offset = 0
            for idx in range(CALENDAR_PAGES):
                if await needs_calendar_recovery(page, route):
                    recovered = await recover_route_calendar_state(page, route, url, month_offset)
                    if not recovered:
                        if await is_rate_limited_page(page):
                            await trigger_global_cooldown(route["label"], global_rate_limit, global_rate_limit_lock)
                            if route_attempt < MAX_ROUTE_ATTEMPTS:
                                await wait_rate_limit_cooldown(route["label"], route_attempt)
                                raise RuntimeError("recover_failed_rate_limited")
                        raise RuntimeError("recover_failed")

                entries = await extract_calendar_cells(page)
                for entry in entries:
                    if entry["date"] not in date_price:
                        date_price[entry["date"]] = entry["price"]

                print(f"    page {idx + 1}: +{len(entries)} / total {len(date_price)}")

                if idx < CALENDAR_PAGES - 1:
                    if not await click_next_month(page, steps=2):
                        break
                    month_offset += 1

            records = [
                make_jsonl_record(date_str, price, route, ingest_time)
                for date_str, price in sorted(date_price.items())
            ]

            if records:
                print(f"  [Done] {route['label']} => {len(records)} rows")
                return records, False

            if await is_rate_limited_page(page):
                await trigger_global_cooldown(route["label"], global_rate_limit, global_rate_limit_lock)
                if route_attempt < MAX_ROUTE_ATTEMPTS:
                    await wait_rate_limit_cooldown(route["label"], route_attempt)
                    continue

            return [], False

        except Exception as exc:
            msg = short_error(exc)
            print(f"  [Error] {route['label']}: {msg}")
            lower_msg = msg.lower()
            if "시도 제한" in msg or "too many" in lower_msg:
                await trigger_global_cooldown(route["label"], global_rate_limit, global_rate_limit_lock)
            if route_attempt < MAX_ROUTE_ATTEMPTS:
                await asyncio.sleep(random.uniform(1.0, 2.0))
                continue
            return [], True

    return [], True


def failed_route_item(route: Dict) -> Dict:
    return {
        "route_key": route["route_key"],
        "label": route["label"],
        "dcity": route["dcity"],
        "dairport": route["dairport"],
        "acity": route["acity"],
        "aairport": route["aairport"],
    }


def save_failed_routes(path: Path, routes: List[Dict]) -> None:
    dedup = {}
    for route in routes:
        dedup[route["route_key"]] = failed_route_item(route)
    with path.open("w", encoding="utf-8") as f:
        json.dump(list(dedup.values()), f, ensure_ascii=False, indent=2)


async def main() -> None:
    ingest_time = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    dt_str = datetime.now().strftime("%Y-%m-%d")
    hour_str = datetime.now().strftime("%H")

    out_dir = OUTPUT_DIR / f"dt={dt_str}" / f"hour={hour_str}"
    out_dir.mkdir(parents=True, exist_ok=True)

    jsonl_path = out_dir / "all_cities.jsonl"
    csv_path = out_dir / "all_cities.csv"
    failed_path = out_dir / "failed_routes.json"

    mapping = load_mapping()
    health = report_mapping_health(mapping)
    allow_unhealthy = os.getenv("ALLOW_UNHEALTHY_MAPPING", "0") == "1"
    if health["total"] > 0 and health["ratio"] > 0.95 and not allow_unhealthy:
        raise RuntimeError(
            "trip_city mapping looks broken (almost all trip_city==trip_airport). "
            "Run rebuild_trip_city_mapping.py, or set ALLOW_UNHEALTHY_MAPPING=1 to force run."
        )

    all_routes = build_routes(mapping)
    done_keys = load_checkpoint(dt_str)
    if os.getenv("IGNORE_CHECKPOINT", "0") == "1":
        print("  [Info] IGNORE_CHECKPOINT=1 -> skip checkpoint filtering")
        done_keys = set()

    route_filter = (os.getenv("ROUTE_FILTER") or "").strip()
    filtered_routes = all_routes
    if route_filter:
        filtered_routes = [r for r in all_routes if matches_route_filter(r, route_filter)]
        print(f"  [Info] ROUTE_FILTER='{route_filter}' -> {len(filtered_routes)} routes")

    pending = [route for route in filtered_routes if route["route_key"] not in done_keys]

    route_limit = os.getenv("ROUTE_LIMIT")
    if route_limit:
        try:
            limit = int(route_limit)
            if limit > 0:
                pending = pending[:limit]
        except ValueError:
            pass

    print(f"Total routes: {len(filtered_routes)}")
    print(f"Done routes: {len(done_keys)}")
    print(f"Pending routes: {len(pending)}")

    csv_exists = csv_path.exists()
    csv_file = csv_path.open("a", encoding="utf-8-sig", newline="")
    jsonl_file = jsonl_path.open("a", encoding="utf-8")
    csv_writer = csv.DictWriter(
        csv_file,
        fieldnames=[
            "city_code",
            "city_name_kr",
            "country_kr",
            "direction",
            "dest_airport",
            "date",
            "price_krw",
            "collected_date",
        ],
    )
    if not csv_exists:
        csv_writer.writeheader()

    semaphore = asyncio.Semaphore(CONCURRENCY)
    file_lock = asyncio.Lock()
    state_lock = asyncio.Lock()
    global_rate_limit_lock = asyncio.Lock()
    global_rate_limit = {"until": 0.0}
    progress = {"done": 0, "total": len(pending)}
    retry_candidates: List[Dict] = []
    final_failed_map: Dict[str, Dict] = {}
    retry_rounds = ZERO_RESULT_RETRY_ROUNDS

    async with async_playwright() as p:
        headless = os.getenv("TRIP_HEADLESS", "0") == "1"
        slow_mo = 0 if headless else 50
        browser = await p.chromium.launch(headless=headless, slow_mo=slow_mo, args=["--incognito"])
        session_lock = asyncio.Lock()
        session_state: Dict = {"session": None, "used": 0}

        async def ensure_worker_session(force_new: bool = False) -> Dict:
            if force_new and session_state["session"] is not None:
                await close_worker_session(session_state["session"])
                session_state["session"] = None
                session_state["used"] = 0
            if session_state["session"] is None:
                session_state["session"] = await create_worker_session(browser)
                session_state["used"] = 0
                print("  [Session] opened new browser context/page")
            return session_state["session"]

        async def persist_records(records: List[Dict], route: Dict) -> None:
            if not records:
                return
            async with file_lock:
                for rec in records:
                    jsonl_file.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    csv_writer.writerow(
                        {
                            "city_code": rec["entity"]["city_code"],
                            "city_name_kr": rec["entity"]["city_name_kr"],
                            "country_kr": route["country_kr"],
                            "direction": rec["entity"]["direction"],
                            "dest_airport": rec["entity"]["dest_airport"],
                            "date": rec["event_time"],
                            "price_krw": rec["payload"]["price"],
                            "collected_date": rec["ingest_time"][:10],
                        }
                    )
                jsonl_file.flush()
                csv_file.flush()

        async def run_one(route: Dict, phase: str, phase_progress: Dict) -> None:
            async with semaphore:
                async with session_lock:
                    force_new = (
                        session_state["session"] is None
                        or session_state["used"] >= ROUTES_PER_CONTEXT
                    )
                    worker_session = await ensure_worker_session(force_new=force_new)
                    records, need_reset_session = await scrape_route(
                        worker_session["page"],
                        route,
                        ingest_time,
                        global_rate_limit,
                        global_rate_limit_lock,
                    )
                    session_state["used"] += 1
                    if need_reset_session:
                        await ensure_worker_session(force_new=True)
                await persist_records(records, route)

                async with state_lock:
                    phase_progress["done"] += 1
                    if records:
                        done_keys.add(route["route_key"])
                        save_checkpoint(done_keys, dt_str)
                        if route["route_key"] in final_failed_map:
                            final_failed_map.pop(route["route_key"], None)
                        print(
                            f"  [{phase_progress['done']}/{phase_progress['total']}] "
                            f"OK {route['label']} ({len(records)} rows)"
                        )
                    else:
                        if phase == "initial":
                            retry_candidates.append(route)
                            print(
                                f"  [{phase_progress['done']}/{phase_progress['total']}] "
                                f"ZERO {route['label']} (queued retry)"
                            )
                        else:
                            final_failed_map[route["route_key"]] = route
                            print(
                                f"  [{phase_progress['done']}/{phase_progress['total']}] "
                                f"FAIL {route['label']} (0 rows after retry)"
                            )

        tasks = [asyncio.create_task(run_one(route, "initial", progress)) for route in pending]
        await asyncio.gather(*tasks)

        for retry_round in range(1, retry_rounds + 1):
            if not retry_candidates:
                break

            retry_batch = retry_candidates[:]
            retry_candidates.clear()
            retry_progress = {"done": 0, "total": len(retry_batch)}
            print(f"\n[Retry Round {retry_round}] {len(retry_batch)} zero-result routes")

            retry_tasks = [
                asyncio.create_task(run_one(route, "retry", retry_progress))
                for route in retry_batch
            ]
            await asyncio.gather(*retry_tasks)

        if session_state["session"] is not None:
            await close_worker_session(session_state["session"])
        await browser.close()

    if final_failed_map:
        save_failed_routes(failed_path, list(final_failed_map.values()))
        print(f"[Failed Routes] saved {len(final_failed_map)} routes -> {failed_path}")
    elif failed_path.exists():
        failed_path.unlink(missing_ok=True)
        print("[Failed Routes] none")

    jsonl_file.close()
    csv_file.close()

    print("\n[Finished]")
    print(f"JSONL: {jsonl_path}")
    print(f"CSV:   {csv_path}")


if __name__ == "__main__":
    asyncio.run(main())
