"""Danger API country aliases normalized to County.country_name values."""

from __future__ import annotations


# API 응답의 국가명과 County 테이블의 국가명이 다른 경우를 여기서 정규화한다.
COUNTRY_NAME_ALIASES = {
    "United States of America": "United States",
    "Italia": "Italy",
    "Swiss": "Switzerland",
    "Türkiye": "Turkey",
    "TÃ¼rkiye": "Turkey",
    "Republic of Turkiye": "Turkey",
    "Republic of South Africa": "South Africa",
    "South Africa": "South Africa",
    "Czech": "Czech Republic",
    "United Arab Emirates : UAE": "United Arab Emirates",
    "Nepal Federation": "Nepal",
}


def normalize_country_name(country_name: str | None) -> str | None:
    """Return the County table name that matches the incoming API country name."""
    if not country_name:
        return country_name
    return COUNTRY_NAME_ALIASES.get(country_name, country_name)
