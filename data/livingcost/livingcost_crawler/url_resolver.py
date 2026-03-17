"""검증 URL 인덱싱/조회 유틸.

국가 페이지를 다시 탐색하지 않고, 사전에 검증된 URL로 직접 접근하기 위한 모듈이다.
"""

from typing import Any, Dict, Optional, Tuple

from .text_utils import country_cost_url, extract_cost_path_slugs, fuzzy_best, slugify_city, slugify_country

# 검증 URL 파일에 없더라도 고정적으로 바로 접근 가능한 국가 URL을 보강한다.
COUNTRY_URL_OVERRIDES: Dict[str, str] = {
    "south-korea": "https://livingcost.org/cost/south-korea",
}

# 사용자가 원하는 표시 도시명과 실제 livingcost URL 슬러그가 다른 케이스를 강제 매핑한다.
CITY_URL_OVERRIDES: Dict[Tuple[str, str], str] = {
    ("bolivia", "uyuni"): "https://livingcost.org/cost/bolivia/potosi",
    ("philippines", "bohol"): "https://livingcost.org/cost/philippines/cebu",
    ("canada", "quebec-city"): "https://livingcost.org/cost/canada/qc/quebec",
    ("indonesia", "bali"): "https://livingcost.org/cost/indonesia/denpasar",
    ("palau", "koror"): "https://livingcost.org/cost/palau/ngerulmud",
    ("south-korea", "seoul"): "https://livingcost.org/cost/south-korea/seoul",
}


def build_verified_url_indexes(verified_urls: Dict[str, Any]) -> Tuple[Dict[str, str], Dict[Tuple[str, str], str]]:
    """검증 URL 원본 payload를 조회용 인덱스로 변환한다.

    반환:
    - country_index: country_slug -> 국가 URL
    - city_index: (country_slug, city_slug) -> 도시 URL
    """
    country_index: Dict[str, str] = {}
    city_index: Dict[Tuple[str, str], str] = {}

    # 국가 URL 인덱스 생성.
    country_urls = verified_urls.get("country_urls", {}) or {}
    for url in country_urls.values():
        if not isinstance(url, str):
            continue
        country_slug, city_slug = extract_cost_path_slugs(url)
        if country_slug and city_slug is None and country_slug not in country_index:
            country_index[country_slug] = url

    # 도시 URL 인덱스 생성.
    city_urls_by_country = verified_urls.get("city_urls_by_country", {}) or {}
    for city_map in city_urls_by_country.values():
        if not isinstance(city_map, dict):
            continue
        for url in city_map.values():
            if not isinstance(url, str):
                continue
            country_slug, city_slug = extract_cost_path_slugs(url)
            if country_slug and city_slug:
                key = (country_slug, city_slug)
                if key not in city_index:
                    city_index[key] = url

    return country_index, city_index


def resolve_urls_from_verified(
    country: str,
    city: str,
    country_index: Dict[str, str],
    city_index: Dict[Tuple[str, str], str],
) -> Tuple[str, Optional[str]]:
    """국가/도시명을 검증 URL 인덱스로 해석한다.

    해석 순서:
    1) exact slug 매칭
    2) 같은 국가 안에서 fuzzy 매칭
    3) `-city` 접미사 제거 fallback
    """
    country_slug = slugify_country(country)
    country_url = country_index.get(country_slug, COUNTRY_URL_OVERRIDES.get(country_slug, country_cost_url(country)))

    city_slug = slugify_city(city)

    # 1) 사전 오버라이드가 있으면 최우선 적용한다.
    override_url = CITY_URL_OVERRIDES.get((country_slug, city_slug))
    if override_url:
        return country_url, override_url

    # 2) 검증 URL 인덱스 exact 매칭.
    city_url = city_index.get((country_slug, city_slug))
    if city_url:
        return country_url, city_url

    # 3) 오탈자 대응을 위해 같은 국가 후보 안에서만 fuzzy 매칭 수행.
    candidate_keys = [slug for (cslug, slug) in city_index.keys() if cslug == country_slug]
    best = fuzzy_best(city_slug, candidate_keys, min_ratio=0.82)
    if best:
        return country_url, city_index[(country_slug, best)]

    # 4) `New York City`처럼 `-city`로 끝나는 표기 변형 보정.
    if city_slug.endswith("-city"):
        trimmed = city_slug[: -len("-city")]
        city_url = city_index.get((country_slug, trimmed))
        if city_url:
            return country_url, city_url

    return country_url, None
