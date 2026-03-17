"""기본/특별 여행경보 응답을 국가당 1행으로 병합한다."""

from __future__ import annotations

import html
import re


_TEXT_FIELDS = (
    "attention",
    "attention_partial",
    "attention_note",
    "ban_note",
    "ban_yn_partial",
    "ban_yna",
    "control",
    "control_partial",
    "control_note",
    "country_name",
    "country_en_name",
    "limita",
    "limita_partial",
    "limita_note",
    "evacuate_rcmnd_remark",
    "evacuate_region_ty",
    "forbidden_rcmnd_remark",
    "forbidden__region_ty",
)


def _first_item(items_by_country, country_code):
    items = items_by_country.get(country_code) or []
    return items[0] if items else {}


def _safe_int(value, fallback):
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _normalize_text(value):
    if not isinstance(value, str):
        return value
    text = html.unescape(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text or None


def _is_ukraine_border_noise(text):
    if not text:
        return False
    has_border_phrase = "우크라이나 접경지역" in text and "30km" in text
    has_russia_border_detail = any(
        keyword in text for keyword in ("쿠르스크주", "로스토프", "벨고로드", "보로네시", "브랸스크")
    )
    has_exclusion_phrase = "특별여행주의보" in text or "발령 지역을 제외한 지역" in text
    return has_border_phrase and (has_russia_border_detail or has_exclusion_phrase)


def _sanitize_row_text_fields(row):
    sanitized = dict(row)
    for key in _TEXT_FIELDS:
        value = _normalize_text(sanitized.get(key))
        if isinstance(value, str) and _is_ukraine_border_noise(value):
            sanitized[key] = None
            continue
        sanitized[key] = value
    return sanitized


def merge_country_danger_payloads(base_items_by_country, special_items_by_country):
    """ISO2 기준으로 두 응답을 병합해 danger 테이블 payload를 만든다."""
    country_codes = sorted(set(base_items_by_country) | set(special_items_by_country))
    merged_rows = []
    for country_code in country_codes:
        base_item = _first_item(base_items_by_country, country_code)
        special_item = _first_item(special_items_by_country, country_code)

        if not base_item and not special_item:
            continue

        merged_rows.append(
            _sanitize_row_text_fields(
                {
                    "id": _safe_int(base_item.get("id"), _safe_int(special_item.get("id"), 0)),
                    "country_id": None,
                    "attention": base_item.get("attention"),
                    "attention_partial": base_item.get("attention_partial"),
                    "attention_note": base_item.get("attention_note"),
                    "ban_note": base_item.get("ban_note"),
                    "ban_yn_partial": base_item.get("ban_yn_partial"),
                    "ban_yna": base_item.get("ban_yna"),
                    "control": base_item.get("control"),
                    "control_partial": base_item.get("control_partial"),
                    "control_note": base_item.get("control_note"),
                    "country_name": base_item.get("country_name") or special_item.get("country_nm"),
                    "country_en_name": base_item.get("country_en_name") or special_item.get("country_eng_nm"),
                    "limita": base_item.get("limita"),
                    "limita_partial": base_item.get("limita_partial"),
                    "limita_note": base_item.get("limita_note"),
                    "evacuate_rcmnd_remark": special_item.get("evacuate_rcmnd_remark"),
                    "evacuate_region_ty": special_item.get("evacuate_region_ty"),
                    "forbidden_rcmnd_remark": special_item.get("forbidden_rcmnd_remark"),
                    "forbidden__region_ty": special_item.get("forbidden_region_ty"),
                }
            )
        )
    return merged_rows
