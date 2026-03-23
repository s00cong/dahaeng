import pandas as pd

# ─── 스크립트에 정의된 months / destinations ───────────────────────────────
MONTHS = ["3월", "4월", "5월", "6월", "7월", "8월"]
DESTINATIONS = [
    'AGR', 'AKL', 'AMS', 'AYT', 'BCN', 'BER', 'BKI', 'BKK', 'BNE', 'BOD',
    'BOM', 'BUD', 'CAN', 'CDG', 'CEB', 'CGN', 'CHC', 'CNX', 'CPT', 'CRK',
    'CTS', 'CUN', 'CXR', 'DAD', 'DCA', 'DEB', 'DEL', 'DME', 'DMK', 'DUR',
    'DVO', 'DYG', 'EDI', 'EWR', 'FCO', 'FLR', 'FRA', 'FUK', 'GIG', 'GOI',
    'GRU', 'GRX', 'GVA', 'HAM', 'HAN', 'HEL', 'HKG', 'HKT', 'HND', 'HPH',
    'HRB', 'IAD', 'IGU', 'ILO', 'IPH', 'IST', 'ITM', 'JAI', 'JFK', 'JHB',
    'JNB', 'KBV', 'KHH', 'KIX', 'KLO', 'KOS', 'KUL', 'LAS', 'LAX', 'LED',
    'LGA', 'LGK', 'LGW', 'LHR', 'LIN', 'LPL', 'LYS', 'MAD', 'MAN', 'MDW',
    'MEL', 'MEX', 'MIA', 'MNL', 'MPH', 'MRS', 'MUC', 'MXP', 'NAP', 'NCE',
    'NRT', 'OKA', 'OOL', 'ORD', 'ORY', 'PEK', 'PER', 'PKX', 'PNH', 'PPS',
    'PQC', 'PVG', 'RMQ', 'RTM', 'RVN', 'SAI', 'SAW', 'SFO', 'SGN', 'SHA',
    'SIN', 'STN', 'SVO', 'SVQ', 'SYD', 'SZX', 'TAO', 'TPE', 'TSA', 'UBN',
    'UTP', 'VCE', 'VKO', 'VVO', 'YQB', 'YUL', 'YVR', 'YYZ', 'ZQN', 'ZRH',
    'ALA', 'ARN', 'ATH', 'BRU', 'BTH', 'CAI', 'CGK', 'CMN', 'CPH', 'DOH',
    'DPS', 'DXB', 'EZE', 'GUM', 'HNL', 'KEF', 'KTM', 'LIM', 'LIS', 'LPB',
    'LPQ', 'MFM', 'MLE', 'MRU', 'OPO', 'OSL', 'PRG', 'RAK', 'ROR', 'SCL',
    'SEA', 'SPN', 'TAG', 'UYU', 'VIE', 'VTE', 'WAW', 'YIA', 'ZAG',
]

# 빈값 여부를 판단할 컬럼 목록
CHECK_COLS = [
    "Hotel Price / Night",
    "Flight Price Range", "Flight Price Low", "Flight Price High",
    "Peak Season Months (Raw)", "Peak Season Months (List)",
    "Off Season Months (Raw)", "Off Season Months (List)",
    "Flight 1 Airline", "Flight 1 Stops", "Flight 1 Return Stops",
    "Flight 1 Duration", "Flight 1 Departure Airport", "Flight 1 Arrival Airport",
    "Flight 1 Price", "Flight 1 Is Alternate Airport", "Flight 1 Alternate Info",
    "Flight 2 Airline", "Flight 2 Stops", "Flight 2 Return Stops",
    "Flight 2 Duration", "Flight 2 Departure Airport", "Flight 2 Arrival Airport",
    "Flight 2 Price", "Flight 2 Is Alternate Airport", "Flight 2 Alternate Info",
    "Flight 3 Airline", "Flight 3 Stops", "Flight 3 Return Stops",
    "Flight 3 Duration", "Flight 3 Departure Airport", "Flight 3 Arrival Airport",
    "Flight 3 Price", "Flight 3 Is Alternate Airport", "Flight 3 Alternate Info",
]

CSV_FILE = "explore_prices_live_20260308_155030.csv"

def is_empty_value(val) -> bool:
    """N/A, 빈 문자열, NaN 모두 '빈값'으로 처리"""
    if pd.isna(val):
        return True
    return str(val).strip() in ("", "N/A")

def main():
    df = pd.read_csv(CSV_FILE, encoding="utf-8-sig")

    # CSV에 존재하는 (Month, Destination) 조합 집합
    csv_pairs = set(zip(df["Month"].astype(str).str.strip(),
                        df["Destination"].astype(str).str.strip()))

    # 스크립트 전체 조합 집합
    all_pairs = {(m, d) for m in MONTHS for d in DESTINATIONS}

    # ── 1. CSV에 없는 조합 ──────────────────────────────────────────────────
    missing = sorted(all_pairs - csv_pairs, key=lambda x: (MONTHS.index(x[0]), x[1]))

    print(f"\n{'='*60}")
    print(f"[1] CSV에 없는 조합: 총 {len(missing)}개")
    print(f"{'='*60}")
    for month, dest in missing:
        print(f"  {month}  {dest}")

    # ── 2. 존재하지만 핵심 컬럼이 전부 빈값인 조합 ────────────────────────
    # CHECK_COLS 중 실제로 df에 있는 컬럼만 사용
    available_cols = [c for c in CHECK_COLS if c in df.columns]
    missing_cols   = [c for c in CHECK_COLS if c not in df.columns]
    if missing_cols:
        print(f"\n[참고] CSV에 없는 컬럼 {len(missing_cols)}개: {missing_cols}")

    all_empty_mask = df[available_cols].apply(
        lambda row: all(is_empty_value(v) for v in row), axis=1
    )
    empty_df = df[all_empty_mask][["Month", "Destination"]].copy()
    empty_df = empty_df.sort_values(["Month", "Destination"])

    print(f"\n{'='*60}")
    print(f"[2] 핵심 컬럼이 모두 빈값(N/A or 빈 문자열)인 조합: 총 {len(empty_df)}개")
    print(f"{'='*60}")
    for _, row in empty_df.iterrows():
        print(f"  {row['Month']}  {row['Destination']}")

    # ── 3. 두 결과 합산 (재크롤링 필요 목록) ─────────────────────────────
    missing_set  = set(missing)
    empty_set    = set(zip(empty_df["Month"], empty_df["Destination"]))
    need_recrawl = sorted(missing_set | empty_set,
        key=lambda x: (MONTHS.index(x[0]) if x[0] in MONTHS else 99, x[1]))

    print(f"\n{'='*60}")
    print(f"[3] 재크롤링 필요 전체 목록 (없음 + 빈값): 총 {len(need_recrawl)}개")
    print(f"{'='*60}")
    for month, dest in need_recrawl:
        print(f"  {month}  {dest}")

    # CSV로도 저장
    out_df = pd.DataFrame(need_recrawl, columns=["Month", "Destination"])
    out_df.to_csv("recrawl_targets.csv", index=False, encoding="utf-8-sig")
    print(f"\n재크롤링 목록 → recrawl_targets.csv 저장 완료")

if __name__ == "__main__":
    main()
