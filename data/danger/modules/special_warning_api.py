"""특별 여행경보 API 호출과 파일 저장 유틸."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import requests

SERVICE_KEY = "b3f5302dcd55adc10d83b0a5f6f35e9f0197d2a1b8ca8d5b4d29cb08ee2338c9"
BASE_URL = "https://apis.data.go.kr/1262000/SptravelWarningServiceV2/getSptravelWarningListV2"
COUNTRY_NAME_TO_ISO2 = {
    "미국": "US",
    "베트남": "VN",
    "일본": "JP",
    "중국": "CN",
    "태국": "TH",
    "필리핀": "PH",
    "프랑스": "FR",
    "러시아": "RU",
    "호주": "AU",
    "대만": "TW",
    "영국": "GB",
    "독일": "DE",
    "싱가포르": "SG",
    "이탈리아": "IT",
    "네덜란드": "NL",
    "인도네시아": "ID",
    "말레이시아": "MY",
    "캐나다": "CA",
    "캄보디아": "KH",
    "몽골": "MN",
    "뉴질랜드": "NZ",
    "인도": "IN",
    "스페인": "ES",
    "브라질": "BR",
    "스위스": "CH",
    "멕시코": "MX",
    "헝가리": "HU",
    "핀란드": "FI",
    "터키": "TR",
    "남아프리카 공화국": "ZA",
    "라오스": "LA",
    "체코": "CZ",
    "오스트리아": "AT",
    "크로아티아": "HR",
    "아랍에미리트": "AE",
    "몰디브": "MV",
    "포르투갈": "PT",
    "그리스": "GR",
    "카타르": "QA",
    "폴란드": "PL",
    "스웨덴": "SE",
    "노르웨이": "NO",
    "페루": "PE",
    "이집트": "EG",
    "모리셔스": "MU",
    "아이슬란드": "IS",
    "덴마크": "DK",
    "벨기에": "BE",
    "볼리비아": "BO",
    "아르헨티나": "AR",
    "칠레": "CL",
    "네팔": "NP",
    "팔라우": "PW",
    "카자흐스탄": "KZ",
    "모로코": "MA",
    "쿠바": "CU",
    "케냐": "KE",
}
COUNTRY_ISO2_CODES = list(COUNTRY_NAME_TO_ISO2.values())
DEFAULT_OUTPUT_FILE = Path(__file__).parent.parent / "special_travel_alert_items.json"


def extract_special_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        items = payload["response"]["body"]["items"]["item"]
    except (KeyError, TypeError):
        return []

    if items is None:
        return []
    if isinstance(items, dict):
        return [items]
    if isinstance(items, list):
        return items
    return []


def fetch_country_items(country_iso_alp2: str) -> list[dict[str, Any]]:
    params = {
        "serviceKey": SERVICE_KEY,
        "returnType": "JSON",
        "numOfRows": 100,
        "pageNo": 1,
        "cond[country_iso_alp2::EQ]": country_iso_alp2.upper(),
    }
    resp = requests.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    return extract_special_items(resp.json())


def fetch_items_for_countries(country_iso2_codes: list[str] | None = None) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    target_codes = country_iso2_codes or COUNTRY_ISO2_CODES
    for country_iso_alp2 in target_codes:
        result[country_iso_alp2] = fetch_country_items(country_iso_alp2)
    return result


def run_default_fetch(output_file: str | Path = DEFAULT_OUTPUT_FILE) -> int:
    result: dict[str, list[dict[str, Any]]] = {}
    failed: dict[str, str] = {}

    for country_iso_alp2 in COUNTRY_ISO2_CODES:
        try:
            result[country_iso_alp2] = fetch_country_items(country_iso_alp2)
        except Exception as exc:
            failed[country_iso_alp2] = str(exc)
            result[country_iso_alp2] = []
        time.sleep(0.2)

    output = {
        "type": "special_travel_alert",
        "total_countries": len(COUNTRY_ISO2_CODES),
        "country_name_to_iso2": COUNTRY_NAME_TO_ISO2,
        "data": result,
        "failed": failed,
    }
    output_path = Path(output_file)
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(result)


def main() -> None:
    saved_count = run_default_fetch()
    print(f"Saved {saved_count} country results to {DEFAULT_OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()

