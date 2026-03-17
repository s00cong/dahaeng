"""두 여행경보 API를 감싸는 fetch 래퍼."""

from __future__ import annotations

try:
    from danger.modules.special_warning_api import COUNTRY_ISO2_CODES as SPECIAL_COUNTRY_CODES
    from danger.modules.special_warning_api import fetch_country_items as fetch_special_country_items
    from danger.modules.warning_api import DEFAULT_SERVICE_KEY as WARNING_SERVICE_KEY
    from danger.modules.warning_api import fetch_items_for_countries as fetch_warning_items_for_countries
except ModuleNotFoundError:
    from modules.special_warning_api import COUNTRY_ISO2_CODES as SPECIAL_COUNTRY_CODES
    from modules.special_warning_api import fetch_country_items as fetch_special_country_items
    from modules.warning_api import DEFAULT_SERVICE_KEY as WARNING_SERVICE_KEY
    from modules.warning_api import fetch_items_for_countries as fetch_warning_items_for_countries


def fetch_warning_country_items():
    """기본 여행경보 API 결과를 ISO2 -> item list 형태로 반환한다."""
    return fetch_warning_items_for_countries(
        country_iso_alp2_codes=list(SPECIAL_COUNTRY_CODES),
        service_key=WARNING_SERVICE_KEY,
    )


def fetch_special_warning_country_items():
    """특별 여행경보 API 결과를 ISO2 -> item list 형태로 반환한다."""
    result = {}
    for country_code in SPECIAL_COUNTRY_CODES:
        result[country_code] = fetch_special_country_items(country_code)
    return result
