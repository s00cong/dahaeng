import os
from datetime import date, datetime, timezone
from typing import List

try:
    from exchange.modules.country_currency_map import COUNTRY_NAME_TO_CURRENCY
    from exchange.modules.db_ops import prepare_exchange_db, sync_county_currencies, upsert_exchange_row
    from exchange.modules.rate_rows import build_display_metadata, persist_exchange_row, safe_inverse
except ModuleNotFoundError:
    from modules.country_currency_map import COUNTRY_NAME_TO_CURRENCY
    from modules.db_ops import prepare_exchange_db, sync_county_currencies, upsert_exchange_row
    from modules.rate_rows import build_display_metadata, persist_exchange_row, safe_inverse

BASE_URL = "https://api.exchangerate.host/timeframe"
SOURCE = "KRW"
API_KEY = "02338e66f1e82a38a9feebff4ff53b48"
API_ERROR_LOG_FILE = os.path.join(os.path.dirname(__file__), "api_error.log")

# Runtime payload uses currency values only; key labels are not used for persistence.
COUNTRY_TO_CURRENCY = dict(COUNTRY_NAME_TO_CURRENCY)

DISPLAY_UNIT = {"JPY": 100, "IDR": 100, "VND": 100, "KHR": 100}


def fetch_today_rates(today_str: str, currencies: List[str]) -> dict:
    import requests

    params = {
        "source": SOURCE,
        "start_date": today_str,
        "end_date": today_str,
        "currencies": ",".join(currencies),
        "access_key": API_KEY,
    }
    response = requests.get(BASE_URL, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()
    if not data.get("success", False):
        raise RuntimeError(f"API failed: {data.get('error') or data}")
    return data


def append_api_error_log(error: Exception, *, log_path: str = API_ERROR_LOG_FILE, event_date: str | None = None) -> None:
    log_dir = os.path.dirname(log_path)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)

    occurred_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    log_event_date = event_date or date.today().strftime("%Y-%m-%d")
    message = str(error).replace("\n", " ").strip()
    with open(log_path, "a", encoding="utf-8") as file:
        file.write(f"{occurred_at}\t{log_event_date}\t{message}\n")


def main() -> None:
    today = date.today().strftime("%Y-%m-%d")
    currencies = sorted(set(COUNTRY_TO_CURRENCY.values()))
    db_conn = prepare_exchange_db()

    try:
        sync_county_currencies(db_conn, COUNTRY_NAME_TO_CURRENCY)

        try:
            data = fetch_today_rates(today, currencies)
        except Exception as exc:
            append_api_error_log(exc, event_date=today)
            print(f"ERROR: failed to fetch exchange API. logged to {API_ERROR_LOG_FILE}")
            return

        rates_block = (data.get("rates") or {}).get(today)
        quotes_block = (data.get("quotes") or {}).get(today)

        for _country, cur in COUNTRY_TO_CURRENCY.items():
            rate_1krw_to_cur = None

            if isinstance(rates_block, dict):
                rate_1krw_to_cur = rates_block.get(cur)

            if rate_1krw_to_cur is None and isinstance(quotes_block, dict):
                rate_1krw_to_cur = quotes_block.get(f"{SOURCE}{cur}")

            if rate_1krw_to_cur is None:
                continue

            krw_per_1cur = safe_inverse(rate_1krw_to_cur)
            if krw_per_1cur is None:
                continue

            display_meta = build_display_metadata(cur, DISPLAY_UNIT)
            unit = int(display_meta["display_unit"])
            display_symbol = str(display_meta["display_symbol"])

            persist_exchange_row(
                upsert_func=upsert_exchange_row,
                conn=db_conn,
                event_date=today,
                currency=cur,
                rate_1krw_to_cur=rate_1krw_to_cur,
                krw_per_1cur=krw_per_1cur,
                display_unit=unit,
                display_symbol=display_symbol,
            )
    finally:
        db_conn.close()

    print("DONE")


if __name__ == "__main__":
    main()
