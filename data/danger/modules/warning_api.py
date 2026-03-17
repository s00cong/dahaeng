"""기본 여행경보 API 호출과 JSON 저장 유틸."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlencode
from urllib.request import urlopen

DEFAULT_API_BASE_URL = (
    "https://apis.data.go.kr/1262000/TravelWarningServiceV3/getTravelWarningListV3"
)
DEFAULT_SERVICE_KEY = "b3f5302dcd55adc10d83b0a5f6f35e9f0197d2a1b8ca8d5b4d29cb08ee2338c9"
DEFAULT_COUNTRIES_FILE = Path(__file__).parent.parent / "countries.json"
DEFAULT_OUTPUT_FILE = Path(__file__).parent.parent / "country_items.json"
ISO2_TO_ISO3 = {
    "US": "USA",
    "VN": "VNM",
    "JP": "JPN",
    "CN": "CHN",
    "TH": "THA",
    "PH": "PHL",
    "FR": "FRA",
    "RU": "RUS",
    "AU": "AUS",
    "TW": "TWN",
    "GB": "GBR",
    "DE": "DEU",
    "SG": "SGP",
    "IT": "ITA",
    "NL": "NLD",
    "ID": "IDN",
    "MY": "MYS",
    "CA": "CAN",
    "KH": "KHM",
    "MN": "MNG",
    "NZ": "NZL",
    "IN": "IND",
    "ES": "ESP",
    "BR": "BRA",
    "CH": "CHE",
    "MX": "MEX",
    "HU": "HUN",
    "FI": "FIN",
    "TR": "TUR",
    "ZA": "ZAF",
    "LA": "LAO",
    "CZ": "CZE",
    "AT": "AUT",
    "HR": "HRV",
    "AE": "ARE",
    "MV": "MDV",
    "PT": "PRT",
    "GR": "GRC",
    "QA": "QAT",
    "PL": "POL",
    "SE": "SWE",
    "NO": "NOR",
    "PE": "PER",
    "EG": "EGY",
    "MU": "MUS",
    "IS": "ISL",
    "DK": "DNK",
    "BE": "BEL",
    "BO": "BOL",
    "AR": "ARG",
    "CL": "CHL",
    "NP": "NPL",
    "PW": "PLW",
    "KZ": "KAZ",
    "MA": "MAR",
    "CU": "CUB",
    "KE": "KEN",
    "KR": "KOR",
}


def extract_items_from_api_response(payload: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        item = payload["response"]["body"]["items"]["item"]
    except (KeyError, TypeError) as exc:
        raise ValueError("Could not find response.body.items.item in API response.") from exc

    if isinstance(item, list):
        return item
    if isinstance(item, dict):
        return [item]
    if item is None:
        return []
    raise ValueError("item must be list, dict, or null.")


def save_items_to_json(payload: dict[str, Any], output_path: str | Path) -> list[dict[str, Any]]:
    items = extract_items_from_api_response(payload)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    return items


def build_country_request_url(
    country_iso_alp2: str,
    service_key: str,
    base_url: str = DEFAULT_API_BASE_URL,
    page_no: int = 1,
    num_of_rows: int = 30,
    return_type: str = "JSON",
) -> str:
    iso2_code = country_iso_alp2.upper()
    iso3_code = ISO2_TO_ISO3.get(iso2_code)
    if iso3_code is None:
        raise ValueError(f"Unsupported ISO-2 country code: {country_iso_alp2}")

    params = {
        "serviceKey": service_key,
        "pageNo": page_no,
        "numOfRows": num_of_rows,
        "cond[iso_code::EQ]": iso3_code,
        "returnType": return_type,
    }
    return f"{base_url}?{urlencode(params)}"


def request_json_url(url: str, timeout: int = 20) -> dict[str, Any]:
    with urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_country_items(
    country_iso_alp2: str,
    service_key: str,
    *,
    base_url: str = DEFAULT_API_BASE_URL,
    page_no: int = 1,
    num_of_rows: int = 30,
    timeout: int = 20,
    fetcher: Callable[[str, int], dict[str, Any]] = request_json_url,
) -> list[dict[str, Any]]:
    url = build_country_request_url(
        country_iso_alp2=country_iso_alp2,
        service_key=service_key,
        base_url=base_url,
        page_no=page_no,
        num_of_rows=num_of_rows,
    )
    payload = fetcher(url, timeout)
    return extract_items_from_api_response(payload)


def fetch_items_for_countries(
    country_iso_alp2_codes: list[str],
    service_key: str,
    *,
    base_url: str = DEFAULT_API_BASE_URL,
    page_no: int = 1,
    num_of_rows: int = 30,
    timeout: int = 20,
    fetcher: Callable[[str, int], dict[str, Any]] = request_json_url,
) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    for country_iso_alp2 in country_iso_alp2_codes:
        result[country_iso_alp2] = fetch_country_items(
            country_iso_alp2=country_iso_alp2,
            service_key=service_key,
            base_url=base_url,
            page_no=page_no,
            num_of_rows=num_of_rows,
            timeout=timeout,
            fetcher=fetcher,
        )
    return result


def save_country_items_map_to_json(country_items: dict[str, list[dict[str, Any]]], output_path: str | Path) -> None:
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(country_items, ensure_ascii=False, indent=2), encoding="utf-8")


def run_default_fetch(
    *,
    service_key: str = DEFAULT_SERVICE_KEY,
    countries_file: str | Path = DEFAULT_COUNTRIES_FILE,
    output_file: str | Path = DEFAULT_OUTPUT_FILE,
    base_url: str = DEFAULT_API_BASE_URL,
    page_no: int = 1,
    num_of_rows: int = 30,
    timeout: int = 20,
    fetcher: Callable[[str, int], dict[str, Any]] = request_json_url,
) -> int:
    country_iso_alp2_codes = json.loads(Path(countries_file).read_text(encoding="utf-8-sig"))
    if not isinstance(country_iso_alp2_codes, list) or not all(isinstance(code, str) for code in country_iso_alp2_codes):
        raise ValueError("countries file must be a JSON array of ISO-2 country code strings.")

    country_items = fetch_items_for_countries(
        country_iso_alp2_codes=country_iso_alp2_codes,
        service_key=service_key,
        base_url=base_url,
        page_no=page_no,
        num_of_rows=num_of_rows,
        timeout=timeout,
        fetcher=fetcher,
    )
    save_country_items_map_to_json(country_items, output_file)
    return len(country_items)


def main() -> None:
    saved_count = run_default_fetch()
    print(f"Saved {saved_count} country results to {DEFAULT_OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()

