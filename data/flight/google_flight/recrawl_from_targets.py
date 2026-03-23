import asyncio
import re
import os
import glob
from playwright.async_api import async_playwright
import traceback
import pandas as pd
from datetime import datetime

# ─── 설정 ───────────────────────────────────────────────────────────────────
RECRAWL_CSV   = "recrawl_targets.csv"   # find_missing_and_empty.py 가 생성한 파일

# EXISTING_CSV를 직접 지정하려면 아래 주석 해제 후 경로 입력
# EXISTING_CSV = r"C:\...\explore_prices_live_XXXXXX.csv"
EXISTING_CSV  = None  # None 이면 폴더에서 가장 최근 explore_prices_live_*.csv 자동 선택

# ─── 최신 CSV 자동 탐색 ──────────────────────────────────────────────────────
def find_latest_csv():
    pattern = os.path.join(os.path.dirname(__file__), "explore_prices_live_*.csv")
    files = glob.glob(pattern)
    if not files:
        return None
    return max(files, key=os.path.getmtime)

# ─── season 파싱 (원본과 동일) ────────────────────────────────────────────────
def parse_season_months(text):
    months = set()
    for m in re.finditer(r'(\d+)월\s*[~～]\s*(\d+)월', text):
        start, end = int(m.group(1)), int(m.group(2))
        months.update(range(start, end + 1))
    for m in re.finditer(r'(\d+)월', text):
        months.add(int(m.group(1)))
    return ",".join(str(m) for m in sorted(months)) if months else "N/A"

# ─── 메인 ────────────────────────────────────────────────────────────────────
async def scrape_google_explore():
    # recrawl_targets.csv 로드
    if not os.path.exists(RECRAWL_CSV):
        print(f"[Error] {RECRAWL_CSV} 파일이 없습니다. find_missing_and_empty.py 를 먼저 실행하세요.")
        return

    targets_df = pd.read_csv(RECRAWL_CSV, encoding="utf-8-sig")
    targets_df["Month"]       = targets_df["Month"].astype(str).str.strip()
    targets_df["Destination"] = targets_df["Destination"].astype(str).str.strip()

    # 월별로 목적지 그룹화
    month_dest_map: dict[str, list[str]] = {}
    for _, row in targets_df.iterrows():
        month_dest_map.setdefault(row["Month"], []).append(row["Destination"])

    months = list(month_dest_map.keys())
    total  = sum(len(v) for v in month_dest_map.values())
    print(f"[Init] 재크롤링 대상: {total}개  ({len(months)}개 월)")
    for m, dests in month_dest_map.items():
        print(f"       {m}: {dests}")

    # 기존 CSV 로드
    existing_csv = EXISTING_CSV or find_latest_csv()
    if existing_csv and os.path.exists(existing_csv):
        existing_df = pd.read_csv(existing_csv, encoding="utf-8-sig")
        all_results: dict = {}
        for _, row in existing_df.iterrows():
            key = f"{row.get('Month', '')}_{row.get('Destination', '')}"
            all_results[key] = row.to_dict()
        print(f"[Init] 기존 CSV 로드 완료: {existing_csv}  ({len(all_results)}행)")
    else:
        all_results = {}
        existing_csv = f"explore_prices_live_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        print(f"[Init] 기존 CSV 없음 → 새 파일 생성: {existing_csv}")

    lock = asyncio.Lock()
    incremental_filename = existing_csv  # 동일 파일에 덮어씀

    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", headless=False, slow_mo=50)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})

        url = "https://www.google.com/travel/explore?q=인천 출발 전세계&hl=ko"

        async def process_month(month_name: str, destinations: list[str]):
            page = await context.new_page()
            try:
                print(f"[Explore] Navigating for {month_name}  ({len(destinations)}개 목적지)...")
                await page.goto(url, wait_until="networkidle", timeout=60000)
                await asyncio.sleep(5)
                print(f"\n[Month Loop] >>> Starting Scan for {month_name}")

                # 1. 날짜 선택
                try:
                    date_button_selector = 'div[jsname="S55YWb"]'
                    await page.wait_for_selector(date_button_selector, timeout=10000)
                    await page.click(date_button_selector)
                    await asyncio.sleep(2)

                    flexible_tab = page.get_by_role("tab", name="유연한 일정")
                    if await flexible_tab.count() > 0:
                        await flexible_tab.click()
                        await asyncio.sleep(1)

                    print(f"[Explore] Selecting month: {month_name}")
                    month_button_selector = f'button:has-text("{month_name}")'
                    await page.wait_for_selector(month_button_selector, timeout=5000)
                    await page.click(month_button_selector)
                    await asyncio.sleep(1)

                    confirm_selector = 'button[jsname="McfNlf"]'
                    try:
                        await page.wait_for_selector(confirm_selector, timeout=5000)
                        await page.click(confirm_selector, force=True)
                        print("[Explore] Clicked confirm via jsname selector.")
                    except:
                        try:
                            await page.locator('button:has-text("확인")').click(force=True)
                            print("[Explore] Clicked confirm via text selector.")
                        except:
                            await page.mouse.click(1100, 850)
                            print("[Explore] Clicked confirm via coordinates.")

                    await asyncio.sleep(4)
                except Exception as e:
                    print(f"[Warning] Error selecting month {month_name}: {e}")

                # 2. 출발지 설정 (인천)
                print("[Explore] Setting origin to Incheon...")
                try:
                    selector = 'input[aria-label="출발지가 어디인가요?"]'
                    input_el = await page.wait_for_selector(selector, timeout=10000)

                    box = await input_el.bounding_box()
                    if box:
                        await page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                    else:
                        await page.click(selector, force=True)

                    await asyncio.sleep(1)
                    await page.keyboard.press("Control+A")
                    await page.keyboard.press("Backspace")
                    await asyncio.sleep(1)

                    for char in "인천":
                        await page.keyboard.type(char, delay=200)
                        await asyncio.sleep(0.1)

                    await asyncio.sleep(1.5)
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(1.5)
                    await page.keyboard.press("Enter")
                    print("[Explore] Origin set to Incheon.")
                    await asyncio.sleep(5)
                except Exception as e:
                    print(f"[Warning] Could not set origin: {e}")

                # 3. 목적지 반복 (recrawl 대상만)
                for dest in destinations:
                    search_term = dest

                    for attempt in range(3):
                        print(f"[Explore] Setting destination to {search_term} (Attempt {attempt+1})...")
                        try:
                            selector = 'input[aria-label="목적지가 어디인가요?"]'
                            input_el = await page.wait_for_selector(selector, timeout=10000)

                            box = await input_el.bounding_box()
                            if box:
                                await page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                            else:
                                await page.click(selector, force=True)

                            await asyncio.sleep(1)
                            await page.keyboard.press("Control+A")
                            await page.keyboard.press("Backspace")
                            await asyncio.sleep(1)

                            for char in search_term:
                                await page.keyboard.type(char, delay=200)
                                await asyncio.sleep(0.1)

                            await asyncio.sleep(1.5)
                            if attempt < 2:
                                await page.keyboard.press("ArrowDown")
                                await asyncio.sleep(0.5)
                            await page.keyboard.press("Enter")

                            print(f"[Explore] Destination set to {search_term}.")
                            await asyncio.sleep(5)

                            # ------ 데이터 추출 ------
                            print(f"[Explore] Extracting data for {search_term}...")
                            trip_dates = "N/A"
                            hotel_price_text = "N/A"

                            try:
                                hotel_label = page.locator('text="숙박 정보"').first
                                if await hotel_label.is_visible(timeout=2000):
                                    section_text = await hotel_label.locator("xpath=..").locator("xpath=..").inner_text()
                                    date_match = re.search(r"(\d{1,2}월\s*\d{1,2}일\s*[-~]\s*(?:\d{1,2}월\s*)?\d{1,2}일)", section_text)
                                    if date_match: trip_dates = date_match.group(1)
                            except: pass

                            if trip_dates == "N/A":
                                page_text = await page.inner_text("body")
                                date_match = re.search(r"(\d{1,2}월\s*\d{1,2}일\s*[-~]\s*(?:\d{1,2}월\s*)?\d{1,2}일)", page_text)
                                if date_match: trip_dates = date_match.group(1)

                            flights_data = []
                            flights = await page.query_selector_all('div[jsname="W6gdT"]')

                            if not flights and attempt == 0:
                                alt_city_el = page.locator('span[jsname="sMqrvf"], span.HVJNrc').first
                                if await alt_city_el.is_visible(timeout=2000):
                                    alt_city = await alt_city_el.inner_text()
                                    if alt_city and alt_city.strip() != search_term:
                                        print(f"[Explore] Flight N/A. Found alternate city: {alt_city}. Retrying...")
                                        search_term = alt_city.strip()
                                        back_selector = 'button[aria-label="뒤로 이동"]:visible, button[aria-label="뒤로"]:visible, button[aria-label*="Back"]:visible'
                                        try:
                                            visible_back_btn = page.locator(back_selector).first
                                            await visible_back_btn.wait_for(state="visible", timeout=5000)
                                            await visible_back_btn.click(force=True)
                                        except:
                                            await page.go_back()
                                        await asyncio.sleep(3)
                                        continue

                            elif not flights and attempt == 1:
                                try:
                                    city_el = page.locator('span[jsname="sMqrvf"]').first
                                    country_el = page.locator('div[jsname="ZIcKI"]').first
                                    city    = (await city_el.inner_text()).strip() if await city_el.count() > 0 else ""
                                    country = (await country_el.inner_text()).strip() if await country_el.count() > 0 else ""
                                    if city and country:
                                        search_term = f"{city} {country}"
                                    elif city:
                                        search_term = city
                                except: pass
                                print(f"[Explore] Still no flights. Fresh restart with '{search_term}' (attempt 3)...")

                                await page.goto(url, wait_until="networkidle", timeout=60000)
                                await asyncio.sleep(5)

                                # 월 재선택
                                try:
                                    await page.wait_for_selector('div[jsname="S55YWb"]', timeout=10000)
                                    await page.click('div[jsname="S55YWb"]')
                                    await asyncio.sleep(2)
                                    flexible_tab = page.get_by_role("tab", name="유연한 일정")
                                    if await flexible_tab.count() > 0:
                                        await flexible_tab.click()
                                        await asyncio.sleep(1)
                                    await page.wait_for_selector(f'button:has-text("{month_name}")', timeout=5000)
                                    await page.click(f'button:has-text("{month_name}")')
                                    await asyncio.sleep(1)
                                    try:
                                        await page.wait_for_selector('button[jsname="McfNlf"]', timeout=5000)
                                        await page.click('button[jsname="McfNlf"]', force=True)
                                    except:
                                        try:
                                            await page.locator('button:has-text("확인")').click(force=True)
                                        except:
                                            await page.mouse.click(1100, 850)
                                    await asyncio.sleep(4)
                                except Exception as e:
                                    print(f"[Warning] Error re-selecting month: {e}")

                                # 인천 재입력
                                try:
                                    input_el = await page.wait_for_selector('input[aria-label="출발지가 어디인가요?"]', timeout=10000)
                                    box = await input_el.bounding_box()
                                    if box:
                                        await page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                                    else:
                                        await page.click('input[aria-label="출발지가 어디인가요?"]', force=True)
                                    await asyncio.sleep(1)
                                    await page.keyboard.press("Control+A")
                                    await page.keyboard.press("Backspace")
                                    await asyncio.sleep(1)
                                    for char in "인천":
                                        await page.keyboard.type(char, delay=200)
                                        await asyncio.sleep(0.1)
                                    await asyncio.sleep(1.5)
                                    await page.keyboard.press("Enter")
                                    await asyncio.sleep(1.5)
                                    await page.keyboard.press("Enter")
                                    await asyncio.sleep(5)
                                except Exception as e:
                                    print(f"[Warning] Could not re-set origin: {e}")

                                continue

                            for f in flights[:3]:
                                flight_text = await f.inner_text()
                                f_stops = "N/A"; f_duration = "N/A"; f_airline = "N/A"; f_price = "N/A"; f_alt_info = ""

                                stops_match = re.search(r"(직항|\d+회 경유|경유\s*\d+회)", flight_text)
                                if stops_match: f_stops = stops_match.group(1)

                                f_return_stops = f_stops
                                return_match = re.search(r"도착 항공편:\s*(직항|\d+회 경유|경유\s*\d+회)", flight_text)
                                if return_match: f_return_stops = return_match.group(1)

                                duration_match = re.search(r"(\d+시간(?:\s*\d+분)?)", flight_text)
                                if duration_match: f_duration = duration_match.group(1)

                                airline_span = await f.query_selector('.IMgkJe span')
                                if airline_span: f_airline = await airline_span.inner_text()

                                price_el = await f.query_selector('span[role="text"]')
                                if price_el: f_price = await price_el.inner_text()

                                alt_el = await f.query_selector('div.ETwpl')
                                if alt_el: f_alt_info = await alt_el.inner_text()

                                f_dep_airport = "N/A"; f_arr_airport = "N/A"
                                try:
                                    airport_spans = await f.query_selector_all('span.mrLYAe')
                                    if len(airport_spans) >= 1:
                                        f_dep_airport = (await airport_spans[0].inner_text()).strip()
                                    if len(airport_spans) >= 2:
                                        f_arr_airport = (await airport_spans[1].inner_text()).strip()
                                except: pass

                                flights_data.append({
                                    "Airline": f_airline, "Price": f_price,
                                    "Stops": f_stops, "Return Stops": f_return_stops,
                                    "Duration": f_duration,
                                    "Departure Airport": f_dep_airport,
                                    "Arrival Airport": f_arr_airport,
                                    "Is_Alternate_Airport": "Yes" if f_alt_info else "No",
                                    "Alternate_Info": f_alt_info
                                })

                            while len(flights_data) < 3:
                                flights_data.append({
                                    "Airline": "N/A", "Price": "N/A", "Stops": "N/A",
                                    "Return Stops": "N/A", "Duration": "N/A",
                                    "Departure Airport": "N/A", "Arrival Airport": "N/A",
                                    "Is_Alternate_Airport": "N/A", "Alternate_Info": "N/A"
                                })

                            flight_price_range = "N/A"; flight_price_low = "N/A"; flight_price_high = "N/A"
                            try:
                                detail_btn = page.locator('button[aria-label="세부정보 더보기"][aria-expanded="false"]').first
                                if await detail_btn.count() > 0:
                                    await detail_btn.click()
                                    await asyncio.sleep(1)
                                page_text_for_range = await page.inner_text("body")
                                range_match = re.search(r'(₩\s*[\d,]+)\s*~\s*([\d,]+)', page_text_for_range)
                                if range_match:
                                    low_str = range_match.group(1).replace(' ', '')
                                    high_str = '₩' + range_match.group(2).replace(' ', '')
                                    flight_price_range = f"{low_str}~{range_match.group(2).replace(' ', '')}"
                                    flight_price_low = low_str
                                    flight_price_high = high_str
                                detail_btn_close = page.locator('button[aria-label="세부정보 더보기"][aria-expanded="true"]').first
                                if await detail_btn_close.count() > 0:
                                    await detail_btn_close.click()
                                    await asyncio.sleep(0.5)
                            except: pass

                            try:
                                await page.mouse.wheel(0, 500)
                                await asyncio.sleep(1.5)
                                page_text_for_hotel = await page.inner_text("body")
                                hotel_price_match = re.search(r"숙박 정보.*?(₩\s*[\d,]+)", page_text_for_hotel, re.DOTALL)
                                if hotel_price_match:
                                    hotel_price_text = hotel_price_match.group(1)
                            except: pass

                            peak_season_months_raw = "N/A"; peak_season_months_list = "N/A"
                            off_season_months_raw  = "N/A"; off_season_months_list  = "N/A"
                            try:
                                peak_month_el = page.locator('xpath=//div[normalize-space(text())="성수기"]/following-sibling::div[1]')
                                if await peak_month_el.count() > 0:
                                    text = (await peak_month_el.first.inner_text()).strip()
                                    if re.search(r'\d+월', text):
                                        peak_season_months_raw  = text
                                        peak_season_months_list = parse_season_months(text)
                            except: pass
                            try:
                                off_month_el = page.locator('xpath=//div[normalize-space(text())="비성수기"]/following-sibling::div[1]')
                                if await off_month_el.count() > 0:
                                    text = (await off_month_el.first.inner_text()).strip()
                                    if re.search(r'\d+월', text):
                                        off_season_months_raw  = text
                                        off_season_months_list = parse_season_months(text)
                            except: pass

                            print(f"   -> Dates: {trip_dates}")
                            print(f"   -> Flights Found: {len(flights)}")
                            print(f"   -> Hotel: {hotel_price_text.replace('₩', 'KRW')}")

                            res_key = f"{month_name}_{dest}"
                            res_dict = {
                                "Month": month_name,
                                "Destination": dest,
                                "Searched As": search_term,
                                "Dates": trip_dates,
                                "Hotel Price / Night": hotel_price_text,
                                "Flight Price Range": flight_price_range,
                                "Flight Price Low": flight_price_low,
                                "Flight Price High": flight_price_high,
                                "Peak Season Months (Raw)": peak_season_months_raw,
                                "Peak Season Months (List)": peak_season_months_list,
                                "Off Season Months (Raw)": off_season_months_raw,
                                "Off Season Months (List)": off_season_months_list,
                            }

                            for i in range(3):
                                res_dict[f"Flight {i+1} Airline"]              = flights_data[i]["Airline"]
                                res_dict[f"Flight {i+1} Stops"]                = flights_data[i]["Stops"]
                                res_dict[f"Flight {i+1} Return Stops"]         = flights_data[i]["Return Stops"]
                                res_dict[f"Flight {i+1} Duration"]             = flights_data[i]["Duration"]
                                res_dict[f"Flight {i+1} Departure Airport"]    = flights_data[i]["Departure Airport"]
                                res_dict[f"Flight {i+1} Arrival Airport"]      = flights_data[i]["Arrival Airport"]
                                res_dict[f"Flight {i+1} Price"]                = flights_data[i]["Price"]
                                res_dict[f"Flight {i+1} Is Alternate Airport"] = flights_data[i]["Is_Alternate_Airport"]
                                res_dict[f"Flight {i+1} Alternate Info"]       = flights_data[i]["Alternate_Info"]

                            res_dict["Timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            async with lock:
                                all_results[res_key] = res_dict
                                pd.DataFrame(list(all_results.values())).to_csv(
                                    incremental_filename, index=False, encoding='utf-8-sig')
                            print(f"[Explore] Data saved for {dest} → {incremental_filename}")

                            break  # 성공

                        except Exception as ex:
                            print(f"[Warning] Failed to extract data for {search_term}: {ex}")
                            break

                    # 다음 목적지를 위해 뒤로 가기
                    print(f"[Explore] Returning to Explore main page from {search_term}.")
                    back_selector = 'button[aria-label="뒤로 이동"]:visible, button[aria-label="뒤로"]:visible, button[aria-label*="Back"]:visible'
                    try:
                        visible_back_btn = page.locator(back_selector).first
                        await visible_back_btn.wait_for(state="visible", timeout=5000)
                        await visible_back_btn.click(force=True)
                    except Exception as e:
                        print(f"[Warning] go_back() 사용. Error: {e}")
                        await page.go_back()
                    await asyncio.sleep(3)

            except Exception as e:
                print(f"[Error] Month {month_name} scan failed: {e}")
                traceback.print_exc()
            finally:
                await page.close()

        # 2개 월씩 병렬 실행
        for i in range(0, len(months), 2):
            pair = months[i:i+2]
            print(f"\n[Explore] >>> Running months in parallel: {pair}")
            await asyncio.gather(*[process_month(m, month_dest_map[m]) for m in pair])

        print("\n[Done] Recrawl finished. Keeping browser open for 10 seconds...")
        await asyncio.sleep(10)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_google_explore())
