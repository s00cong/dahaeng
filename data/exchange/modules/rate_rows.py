"""환율 row 계산과 payload 생성 공통 로직."""

from typing import Any, Dict, Optional


def safe_inverse(x: Optional[float]) -> Optional[float]:
    """환율 역수를 안전하게 계산한다."""
    try:
        x = float(x)
        if x == 0:
            return None
        return 1.0 / x
    except Exception:
        return None


def build_exchange_row(
    event_date: str,
    currency: str,
    display_unit: int,
    display_symbol: str,
    rate_1krw_to_cur: float,
    krw_per_1cur: float,
    krw_per_display_unit: float,
) -> Dict[str, Any]:
    """Exchange 테이블에 넣을 공통 payload를 만든다."""
    return {
        "currency": currency,
        "display_unit": display_unit,
        "display_symbol": display_symbol,
        "rate_1krw_to_cur": rate_1krw_to_cur,
        "krw_per_1cur": krw_per_1cur,
        "krw_per_display_unit": krw_per_display_unit,
        "event_date": event_date,
    }


def build_display_metadata(currency: str, display_unit_map: Dict[str, int]) -> Dict[str, object]:
    """통화 코드에 맞는 표시 단위와 표시 문자열을 계산한다."""
    unit = display_unit_map.get(currency, 1)
    symbol = f"{currency}({unit})" if unit != 1 else currency
    return {"display_unit": unit, "display_symbol": symbol}


def persist_exchange_row(
    upsert_func,
    event_date: str,
    currency: str,
    rate_1krw_to_cur: float,
    krw_per_1cur: float,
    display_unit: int,
    display_symbol: str,
    conn=None,
):
    """환율 값을 Exchange payload로 바꿔 DB upsert 함수에 넘긴다."""
    payload = build_exchange_row(
        event_date=event_date,
        currency=currency,
        display_unit=display_unit,
        display_symbol=display_symbol,
        rate_1krw_to_cur=rate_1krw_to_cur,
        krw_per_1cur=krw_per_1cur,
        krw_per_display_unit=krw_per_1cur * display_unit,
    )
    upsert_func(conn, payload)
