"""텍스트/슬러그/유사도 매칭 유틸 함수 모음.

HTML 파싱 결과는 공백/기호/표기 흔들림이 많기 때문에
비교 가능한 키로 정규화하는 과정이 반드시 필요하다.
"""

import re
from difflib import SequenceMatcher
from typing import List, Optional, Tuple


def strip_emoji_and_symbols(value: Optional[str]) -> Optional[str]:
    """품목 라벨에서 이모지/심볼 노이즈를 제거한다.

    사이트 UI 장식 문자 때문에 같은 항목이 다른 문자열로 보이는 문제를 줄인다.
    """
    if not value:
        return value
    value = re.sub(r"[\U00010000-\U0010FFFF]", "", value)
    value = re.sub(r"[\u2600-\u27BF]", "", value)
    value = re.sub(r"[\uD800-\uDFFF]", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def normalize_key(value: Optional[str]) -> str:
    """문자열을 비교 전용 안정 키로 정규화한다.

    공백 통일 -> 숫자/문자 경계 보정 -> 불필요 기호 제거 -> 소문자화 순서로 처리한다.
    """
    if not value:
        return ""
    value = value.replace("\u2009", " ").replace("\u00a0", " ")
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"(\d)([A-Za-z])", r"\1 \2", value)
    value = re.sub(r"[^\w\s.,()/%'\-]+", "", value)
    value = re.sub(r"\s+", " ", value).strip().lower()
    return value


def node_full_text(node) -> str:
    """노드 내부 모든 텍스트를 합쳐 단일 문자열로 만든다.

    `::text`를 모두 가져와 연결하므로 중첩 태그가 있어도 라벨 추출이 가능하다.
    """
    parts = node.css("::text").getall()
    joined = " ".join(p.strip() for p in parts if p and p.strip())
    joined = joined.replace("\u2009", " ").replace("\u00a0", " ")
    joined = re.sub(r"\s+", " ", joined).strip()
    return joined


def parse_price(td) -> Tuple[Optional[float], Optional[str]]:
    """가격 셀(td)에서 USD 값과 표시 텍스트를 추출한다.

    우선 `data-usd`를 신뢰하고, 값이 없으면 표시 텍스트만 반환한다.
    """
    spans = td.css("span[data-usd]")
    if not spans:
        parts = td.css("::text").getall()
        display = " ".join(p.strip() for p in parts if p and p.strip())
        display = re.sub(r"\s+", " ", display).strip()
        return None, display if display else None

    span = spans[0]
    usd = None
    try:
        usd = float(span.attrib.get("data-usd"))
    except Exception:
        usd = None

    display = span.css("::text").get()
    display = display.strip() if display else None
    return usd, display


def fuzzy_best(target_key: str, candidate_keys: List[str], min_ratio: float = 0.78) -> Optional[str]:
    """후보 키 중 가장 유사한 항목을 찾는다.

    오탈자/표기 차이를 흡수하기 위해 유사도 임계치 이상일 때만 매칭한다.
    """
    best = None
    best_ratio = 0.0
    for candidate in candidate_keys:
        ratio = SequenceMatcher(None, target_key, candidate).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best = candidate
    return best if best and best_ratio >= min_ratio else None


def slugify_country(country: str) -> str:
    """국가명을 livingcost URL 슬러그로 변환한다.

    일반 규칙으로 처리되지 않는 국가명은 예외 맵으로 우선 변환한다.
    """
    special = {
        "United States": "united-states",
        "United Kingdom": "united-kingdom",
        "South Africa": "south-africa",
        "New Zealand": "new-zealand",
        "Hong Kong": "hong-kong",
    }
    if country in special:
        return special[country]
    return re.sub(r"[^a-z0-9]+", "-", country.lower()).strip("-")


def slugify_city(city: str) -> str:
    """도시명을 livingcost URL 슬러그로 변환한다.

    `ga`, `gu`, `hi`처럼 사이트가 약어 슬러그를 쓰는 도시는 예외로 처리한다.
    """
    special = {
        "Goa": "ga",
        "Guam": "gu",
        "Hawaii": "hi",
        "Mexico City": "mexico",
        "New York City": "new-york",
    }
    if city in special:
        return special[city]
    return re.sub(r"[^a-z0-9]+", "-", city.lower()).strip("-")


def country_cost_url(country: str) -> str:
    """국가명 기반 기본 cost URL을 생성한다.

    검증 URL 인덱스에 국가가 없을 때 마지막 fallback으로 사용한다.
    """
    return f"https://livingcost.org/cost/{slugify_country(country)}"


def extract_cost_path_slugs(url: str) -> Tuple[Optional[str], Optional[str]]:
    """`/cost/...` URL에서 국가/도시 슬러그를 분리한다.

    반환값:
    - (country_slug, None): 국가 URL
    - (country_slug, city_slug): 도시 URL
    """
    try:
        after = url.split("/cost/", 1)[1].strip("/")
    except Exception:
        return None, None

    if not after:
        return None, None

    parts = [part for part in after.split("/") if part]
    if not parts:
        return None, None

    country_slug = parts[0]
    city_slug = parts[-1] if len(parts) > 1 else None
    return country_slug, city_slug
