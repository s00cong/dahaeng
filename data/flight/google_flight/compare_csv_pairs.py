import pandas as pd
from collections import Counter

# ─── 비교할 두 CSV 파일 ───────────────────────────────────────────────────────
CSV_A = "explore_prices_live_20260307_173501.csv"
CSV_B = "explore_prices_live_20260308_155030.csv"

def load_pairs(filepath):
    df = pd.read_csv(filepath, encoding="utf-8-sig")
    df["Month"]       = df["Month"].astype(str).str.strip()
    df["Destination"] = df["Destination"].astype(str).str.strip()
    pairs = list(zip(df["Month"], df["Destination"]))
    return df, pairs

def print_section(title):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def main():
    df_a, pairs_a = load_pairs(CSV_A)
    df_b, pairs_b = load_pairs(CSV_B)

    set_a  = set(pairs_a)
    set_b  = set(pairs_b)
    cnt_a  = Counter(pairs_a)
    cnt_b  = Counter(pairs_b)

    # ── 기본 현황 ──────────────────────────────────────────────────────────────
    print_section("기본 현황")
    print(f"  {CSV_A}  →  총 {len(pairs_a)}행  (고유 조합 {len(set_a)}개)")
    print(f"  {CSV_B}  →  총 {len(pairs_b)}행  (고유 조합 {len(set_b)}개)")

    # ── 1. 각 파일 내 중복 조합 ────────────────────────────────────────────────
    dup_a = {pair: cnt for pair, cnt in cnt_a.items() if cnt > 1}
    dup_b = {pair: cnt for pair, cnt in cnt_b.items() if cnt > 1}

    print_section(f"[1] {CSV_A} 내 중복 조합: {len(dup_a)}개")
    if dup_a:
        for (month, dest), cnt in sorted(dup_a.items()):
            print(f"    {month}  {dest}  ({cnt}회)")
    else:
        print("    없음")

    print_section(f"[2] {CSV_B} 내 중복 조합: {len(dup_b)}개")
    if dup_b:
        for (month, dest), cnt in sorted(dup_b.items()):
            print(f"    {month}  {dest}  ({cnt}회)")
    else:
        print("    없음")

    # ── 2. 한쪽에만 있는 조합 ─────────────────────────────────────────────────
    only_in_a = sorted(set_a - set_b)
    only_in_b = sorted(set_b - set_a)
    common    = set_a & set_b

    print_section(f"[3] {CSV_A} 에만 있는 조합: {len(only_in_a)}개")
    for month, dest in only_in_a:
        print(f"    {month}  {dest}")

    print_section(f"[4] {CSV_B} 에만 있는 조합: {len(only_in_b)}개")
    for month, dest in only_in_b:
        print(f"    {month}  {dest}")

    # ── 3. 공통 조합 수 ────────────────────────────────────────────────────────
    print_section("요약")
    print(f"  공통 조합 수        : {len(common)}")
    print(f"  {CSV_A} 에만 있음  : {len(only_in_a)}")
    print(f"  {CSV_B} 에만 있음  : {len(only_in_b)}")
    print(f"  {CSV_A} 내 중복 조합: {len(dup_a)} (중복 행 합계 {sum(dup_a.values()) - len(dup_a)}개 초과)")
    print(f"  {CSV_B} 내 중복 조합: {len(dup_b)} (중복 행 합계 {sum(dup_b.values()) - len(dup_b)}개 초과)")
    print()

    # ── 4. 결과 CSV 저장 ───────────────────────────────────────────────────────
    rows = []
    for month, dest in only_in_a:
        rows.append({"Month": month, "Destination": dest, "Status": f"{CSV_A}_only"})
    for month, dest in only_in_b:
        rows.append({"Month": month, "Destination": dest, "Status": f"{CSV_B}_only"})
    for (month, dest), cnt in sorted(dup_a.items()):
        rows.append({"Month": month, "Destination": dest, "Status": f"{CSV_A}_dup(x{cnt})"})
    for (month, dest), cnt in sorted(dup_b.items()):
        rows.append({"Month": month, "Destination": dest, "Status": f"{CSV_B}_dup(x{cnt})"})

    if rows:
        out_df = pd.DataFrame(rows)
        out_df.to_csv("compare_result.csv", index=False, encoding="utf-8-sig")
        print("  결과 저장 → compare_result.csv")
    else:
        print("  두 파일의 조합이 완전히 동일합니다.")

if __name__ == "__main__":
    main()
