import asyncio
import re
from playwright.async_api import async_playwright
import traceback
import pandas as pd
from datetime import datetime

def parse_season_months(text):
    """'8월~10월 및 12월' 같은 텍스트를 파싱해 개별 월 목록 문자열로 반환 (예: '8,9,10,12')"""
    months = set()
    # 범위 패턴: 숫자월~숫자월
    for m in re.finditer(r'(\d+)월\s*[~～]\s*(\d+)월', text):
        start, end = int(m.group(1)), int(m.group(2))
        months.update(range(start, end + 1))
    # 범위 처리 후 남은 개별 월 패턴
    for m in re.finditer(r'(\d+)월', text):
        months.add(int(m.group(1)))
    return ",".join(str(m) for m in sorted(months)) if months else "N/A"

async def scrape_google_explore():
    all_results = {}
    lock = asyncio.Lock()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    incremental_filename = f"explore_prices_live_{timestamp}.csv"

    async with async_playwright() as p:
        # headless=False로 설정하여 지도가 움직이는 것을 직접 볼 수 있게 함
        browser = await p.chromium.launch(channel="chrome", headless=False, slow_mo=50)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})

        print("\n[Explore] >>> Starting Visual World Scan")
        url = "https://www.google.com/travel/explore?q=인천 출발 전세계&hl=ko"
        months = ["3월", "4월", "5월", "6월", "7월", "8월"]
        destinations = ['AGR', 'AKL', 'AMS', 'AYT', 'BCN', 'BER', 'BKI', 'BKK', 'BNE', 'BOD', 'BOM', 'BUD', 'CAN', 'CDG', 'CEB', 'CGN', 'CHC', 'CNX', 'CPT', 'CRK', 'CTS', 'CUN', 'CXR', 'DAD', 'DCA', 'DEB', 'DEL', 'DME', 'DMK', 'DUR', 'DVO', 'DYG', 'EDI', 'EWR', 'FCO', 'FLR', 'FRA', 'FUK', 'GIG', 'GOI', 'GRU', 'GRX', 'GVA', 'HAM', 'HAN', 'HEL', 'HKG', 'HKT', 'HND', 'HPH', 'HRB', 'IAD', 'IGU', 'ILO', 'IPH', 'IST', 'ITM', 'JAI', 'JFK', 'JHB', 'JNB', 'KBV', 'KHH', 'KIX', 'KLO', 'KOS', 'KUL', 'LAS', 'LAX', 'LED', 'LGA', 'LGK', 'LGW', 'LHR', 'LIN', 'LPL', 'LYS', 'MAD', 'MAN', 'MDW', 'MEL', 'MEX', 'MIA', 'MNL', 'MPH', 'MRS', 'MUC', 'MXP', 'NAP', 'NCE', 'NRT', 'OKA', 'OOL', 'ORD', 'ORY', 'PEK', 'PER', 'PKX', 'PNH', 'PPS', 'PQC', 'PVG', 'RMQ', 'RTM', 'RVN', 'SAI', 'SAW', 'SFO', 'SGN', 'SHA', 'SIN', 'STN', 'SVO', 'SVQ', 'SYD', 'SZX', 'TAO', 'TPE', 'TSA', 'UBN', 'UTP', 'VCE', 'VKO', 'VVO', 'YQB', 'YUL', 'YVR', 'YYZ', 'ZQN', 'ZRH', 'ALA', 'ARN', 'ATH', 'BRU', 'BTH', 'CAI', 'CGK', 'CMN', 'CPH', 'DOH', 'DPS', 'DXB', 'EZE', 'GUM', 'HNL', 'KEF', 'KTM', 'LIM', 'LIS', 'LPB', 'LPQ', 'MFM', 'MLE', 'MRU', 'OPO', 'OSL', 'PRG', 'RAK', 'ROR', 'SCL', 'SEA', 'SPN', 'TAG', 'UYU', 'VIE', 'VTE', 'WAW', 'YIA', 'ZAG']
        async def process_month(month_name):
            page = await context.new_page()
            try:
                print(f"[Explore] Navigating to explore URL for {month_name}...")
                await page.goto(url, wait_until="networkidle", timeout=60000)
                await asyncio.sleep(5)
                print(f"\n[Month Loop] >>> Starting Scan for {month_name}")
                
                # 1. 날짜 선택창 열기 및 월 선택
                try:
                    date_button_selector = 'div[jsname="S55YWb"]'
                    await page.wait_for_selector(date_button_selector, timeout=10000)
                    await page.click(date_button_selector)
                    await asyncio.sleep(2)
                    
                    # '유연한 일정' 탭 선택 확인
                    flexible_tab = page.get_by_role("tab", name="유연한 일정")
                    if await flexible_tab.count() > 0:
                        await flexible_tab.click()
                        await asyncio.sleep(1)

                    # 해당 월 클릭
                    print(f"[Explore] Selecting month: {month_name}")
                    month_button_selector = f'button:has-text("{month_name}")'
                    await page.wait_for_selector(month_button_selector, timeout=5000)
                    await page.click(month_button_selector)
                    await asyncio.sleep(1)
                    
                    # '확인' 버튼 클릭 (jsname="McfNlf" 및 다양한 방식 시도)
                    print("[Explore] Clicking 'Confirm' (확인) button...")
                    confirm_selector = 'button[jsname="McfNlf"]'
                    try:
                        # 요소가 클릭 가능한 상태가 될 때까지 대기 후 강제 클릭
                        await page.wait_for_selector(confirm_selector, timeout=5000)
                        await page.click(confirm_selector, force=True)
                        print("[Explore] Clicked confirm via jsname selector.")
                    except:
                        # 텍스트 기반 클릭 시도
                        try:
                            await page.locator('button:has-text("확인")').click(force=True)
                            print("[Explore] Clicked confirm via text selector.")
                        except:
                            # 좌표 클릭 시도 (버튼이 보통 있는 위치)
                            await page.mouse.click(1100, 850)
                            print("[Explore] Clicked confirm via coordinates.")
                    
                    await asyncio.sleep(4) # 반영 대기
                except Exception as e:
                    print(f"[Warning] Error selecting month {month_name}: {e}")

                # 2. 출발지 명시적으로 설정 (사용자 요청 방식 그대로 적용)
                print("[Explore] Setting origin to Incheon...")
                try:
                    selector = 'input[aria-label="출발지가 어디인가요?"]'
                    # 요소가 나타날 때까지 충분히 대기
                    input_el = await page.wait_for_selector(selector, timeout=10000)
                    
                    # 실제 마우스로 중앙 클릭 (방해 요소 회피)
                    box = await input_el.bounding_box()
                    if box:
                        await page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                    else:
                        await page.click(selector, force=True)
                    
                    await asyncio.sleep(1)
                    
                    # 기존 내용 전체 선택 및 지우기
                    await page.keyboard.press("Control+A")
                    await page.keyboard.press("Backspace")
                    await asyncio.sleep(1)
                    
                    # 한 글자씩 키보드 입력 시뮬레이션
                    print("[Explore] Typing '인천'...")
                    for char in "인천":
                        await page.keyboard.type(char, delay=200)
                        await asyncio.sleep(0.1)
                    
                    await asyncio.sleep(1.5)
                    
                    # 엔터 입력 (추천 목록 반영을 위해 2번 입력)
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(1.5)
                    await page.keyboard.press("Enter")
                    
                    print(f"[Explore] Origin set to Incheon via Keyboard simulation.")
                    await asyncio.sleep(5)
                except Exception as e:
                    print(f"[Warning] Could not set origin via keyboard: {e}")

                # 3. 목적지 반복 설정 (출발지와 완벽히 동일한 로직 복사)
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
                                # 드롭다운 첫 번째 옵션 선택 후 확정
                                await page.keyboard.press("ArrowDown")
                                await asyncio.sleep(0.5)
                            await page.keyboard.press("Enter")
                            
                            print(f"[Explore] Destination set to {search_term} via Keyboard simulation.")
                            await asyncio.sleep(5)
                            
                            # ------ 데이터 추출 로직 ------
                            print(f"[Explore] Extracting data for {search_term}...")
                            trip_dates = "N/A"
                            hotel_price_text = "N/A"
                            
                            # 날짜 범위 추출
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

                            # 항공권 상위 3개 분리
                            flights_data = []
                            flights = await page.query_selector_all('div[jsname="W6gdT"]')
                            
                            # 검색결과에 항공권이 없다면 '아그라' 등 대체 도시 텍스트 확인 후 재탐색
                            if not flights and attempt == 0:
                                alt_city_el = page.locator('span[jsname="sMqrvf"], span.HVJNrc').first
                                if await alt_city_el.is_visible(timeout=2000):
                                    alt_city = await alt_city_el.inner_text()
                                    if alt_city and alt_city.strip() != search_term:
                                        print(f"[Explore] Flight N/A. Found alternate city: {alt_city}. Retrying...")
                                        search_term = alt_city.strip()

                                        # 뒤로 가기 후 루프를 돌아 새로운 지역 이름으로 재입력
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
                                # 도시명 + 국가명 조합으로 1번 더 재시도
                                try:
                                    city_el = page.locator('span[jsname="sMqrvf"]').first
                                    country_el = page.locator('div[jsname="ZIcKI"]').first
                                    city = (await city_el.inner_text()).strip() if await city_el.count() > 0 else ""
                                    country = (await country_el.inner_text()).strip() if await country_el.count() > 0 else ""
                                    if city and country:
                                        search_term = f"{city} {country}"
                                    elif city:
                                        search_term = city
                                except:
                                    pass
                                print(f"[Explore] Still no flights. Fresh restart with '{search_term}' (attempt 3)...")

                                # URL 재접속 후 월 선택 및 인천 재입력
                                print(f"[Explore] Attempt 3: Navigating fresh to explore URL for {month_name}...")
                                await page.goto(url, wait_until="networkidle", timeout=60000)
                                await asyncio.sleep(5)

                                # 월 재선택
                                try:
                                    date_button_selector = 'div[jsname="S55YWb"]'
                                    await page.wait_for_selector(date_button_selector, timeout=10000)
                                    await page.click(date_button_selector)
                                    await asyncio.sleep(2)
                                    flexible_tab = page.get_by_role("tab", name="유연한 일정")
                                    if await flexible_tab.count() > 0:
                                        await flexible_tab.click()
                                        await asyncio.sleep(1)
                                    print(f"[Explore] Re-selecting month: {month_name}")
                                    month_button_selector = f'button:has-text("{month_name}")'
                                    await page.wait_for_selector(month_button_selector, timeout=5000)
                                    await page.click(month_button_selector)
                                    await asyncio.sleep(1)
                                    confirm_selector = 'button[jsname="McfNlf"]'
                                    try:
                                        await page.wait_for_selector(confirm_selector, timeout=5000)
                                        await page.click(confirm_selector, force=True)
                                    except:
                                        try:
                                            await page.locator('button:has-text("확인")').click(force=True)
                                        except:
                                            await page.mouse.click(1100, 850)
                                    await asyncio.sleep(4)
                                except Exception as e:
                                    print(f"[Warning] Error re-selecting month {month_name}: {e}")

                                # 인천 재입력
                                print("[Explore] Re-setting origin to Incheon...")
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
                                    print("[Explore] Origin re-set to Incheon.")
                                    await asyncio.sleep(5)
                                except Exception as e:
                                    print(f"[Warning] Could not re-set origin: {e}")

                                continue
                                        
                            for f in flights[:3]:
                                flight_text = await f.inner_text()
                                f_stops = "N/A"
                                f_duration = "N/A"
                                f_airline = "N/A"
                                f_price = "N/A"
                                f_alt_info = ""
                                
                                stops_match = re.search(r"(직항|\d+회 경유|경유\s*\d+회)", flight_text)
                                if stops_match: f_stops = stops_match.group(1)

                                # 도착 항공편 경유 정보 추출 (없으면 출발편과 동일)
                                f_return_stops = f_stops
                                return_match = re.search(r"도착 항공편:\s*(직항|\d+회 경유|경유\s*\d+회)", flight_text)
                                if return_match: f_return_stops = return_match.group(1)
                                
                                duration_match = re.search(r"(\d+시간(?:\s*\d+분)?)", flight_text)
                                if duration_match: f_duration = duration_match.group(1)
                                
                                airline_span = await f.query_selector('.IMgkJe span')
                                if airline_span: f_airline = await airline_span.inner_text()

                                price_el = await f.query_selector('span[role="text"]')
                                if price_el: f_price = await price_el.inner_text()

                                # 인접 대체 공항에 내린 후 자동차 등 부가 이동 시간 ("아그라까지 4시간" 추출)
                                alt_el = await f.query_selector('div.ETwpl')
                                if alt_el: f_alt_info = await alt_el.inner_text()

                                # 출발/도착 공항 코드 추출 (span.mrLYAe 첫 번째 = 출발, 두 번째 = 도착)
                                f_dep_airport = "N/A"
                                f_arr_airport = "N/A"
                                try:
                                    airport_spans = await f.query_selector_all('span.mrLYAe')
                                    if len(airport_spans) >= 1:
                                        f_dep_airport = (await airport_spans[0].inner_text()).strip()
                                    if len(airport_spans) >= 2:
                                        f_arr_airport = (await airport_spans[1].inner_text()).strip()
                                except: pass

                                flights_data.append({
                                    "Airline": f_airline,
                                    "Price": f_price,
                                    "Stops": f_stops,
                                    "Return Stops": f_return_stops,
                                    "Duration": f_duration,
                                    "Departure Airport": f_dep_airport,
                                    "Arrival Airport": f_arr_airport,
                                    "Is_Alternate_Airport": "Yes" if f_alt_info else "No",
                                    "Alternate_Info": f_alt_info
                                })

                            # 만약 항공권이 3개 미만이라면 N/A로 채우기
                            while len(flights_data) < 3:
                                flights_data.append({"Airline": "N/A", "Price": "N/A", "Stops": "N/A", "Return Stops": "N/A", "Duration": "N/A", "Departure Airport": "N/A", "Arrival Airport": "N/A", "Is_Alternate_Airport": "N/A", "Alternate_Info": "N/A"})

                            # 2. 항공편 가격 범위 추출 ("세부정보 더보기" 버튼 클릭 후 추출)
                            flight_price_range = "N/A"
                            flight_price_low = "N/A"
                            flight_price_high = "N/A"
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
                                # 열린 패널 닫기
                                detail_btn_close = page.locator('button[aria-label="세부정보 더보기"][aria-expanded="true"]').first
                                if await detail_btn_close.count() > 0:
                                    await detail_btn_close.click()
                                    await asyncio.sleep(0.5)
                            except: pass

                            # 3. 숙박 정보 추출 (섹션이 보일 수 있도록 살짝 스크롤)
                            try:
                                await page.mouse.wheel(0, 500)
                                await asyncio.sleep(1.5)
                                page_text_for_hotel = await page.inner_text("body")
                                hotel_price_match = re.search(r"숙박 정보.*?(₩\s*[\d,]+)", page_text_for_hotel, re.DOTALL)
                                if hotel_price_match:
                                    hotel_price_text = hotel_price_match.group(1)
                            except: pass

                            # 3. 성수기/비성수기 월 정보 추출 (클래스명 불사용, 텍스트 기반 XPath)
                            peak_season_months_raw = "N/A"
                            peak_season_months_list = "N/A"
                            off_season_months_raw = "N/A"
                            off_season_months_list = "N/A"
                            try:
                                # "성수기" 텍스트 div의 바로 다음 형제 div에서 월 정보 추출
                                peak_month_el = page.locator('xpath=//div[normalize-space(text())="성수기"]/following-sibling::div[1]')
                                if await peak_month_el.count() > 0:
                                    text = (await peak_month_el.first.inner_text()).strip()
                                    if re.search(r'\d+월', text):
                                        peak_season_months_raw = text
                                        peak_season_months_list = parse_season_months(text)
                            except: pass
                            try:
                                off_month_el = page.locator('xpath=//div[normalize-space(text())="비성수기"]/following-sibling::div[1]')
                                if await off_month_el.count() > 0:
                                    text = (await off_month_el.first.inner_text()).strip()
                                    if re.search(r'\d+월', text):
                                        off_season_months_raw = text
                                        off_season_months_list = parse_season_months(text)
                            except: pass

                            print(f"   -> Dates: {trip_dates}")
                            print(f"   -> Flights Found: {len(flights)}")
                            print(f"   -> Hotel: {hotel_price_text.replace('₩', 'KRW')}")

                            # 3. 결과 저장 및 파일 기록
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
                                res_dict[f"Flight {i+1} Airline"] = flights_data[i]["Airline"]
                                res_dict[f"Flight {i+1} Stops"] = flights_data[i]["Stops"]
                                res_dict[f"Flight {i+1} Return Stops"] = flights_data[i]["Return Stops"]
                                res_dict[f"Flight {i+1} Duration"] = flights_data[i]["Duration"]
                                res_dict[f"Flight {i+1} Departure Airport"] = flights_data[i]["Departure Airport"]
                                res_dict[f"Flight {i+1} Arrival Airport"] = flights_data[i]["Arrival Airport"]
                                res_dict[f"Flight {i+1} Price"] = flights_data[i]["Price"]
                                res_dict[f"Flight {i+1} Is Alternate Airport"] = flights_data[i]["Is_Alternate_Airport"]
                                res_dict[f"Flight {i+1} Alternate Info"] = flights_data[i]["Alternate_Info"]
                            
                            res_dict["Timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            async with lock:
                                all_results[res_key] = res_dict
                                pd.DataFrame(list(all_results.values())).to_csv(incremental_filename, index=False, encoding='utf-8-sig')
                            print(f"[Explore] Data saved for {dest}")
                            
                            break # Success, escape the retry loop
                            
                        except Exception as ex:
                            print(f"[Warning] Failed to extract data for {search_term}: {ex}")
                            break # error, go to next destination
                            
                    # 검색 종료, 다음 목적지를 입력하기 위해 뒤로 가기
                    print(f"[Explore] Returning to Explore main page from {search_term}.")
                    back_selector = 'button[aria-label="뒤로 이동"]:visible, button[aria-label="뒤로"]:visible, button[aria-label*="Back"]:visible'
                    try:
                        visible_back_btn = page.locator(back_selector).first
                        await visible_back_btn.wait_for(state="visible", timeout=5000)
                        await visible_back_btn.click(force=True)
                    except Exception as e:
                        print(f"[Warning] Visible back button click failed, trying go_back(). Error: {e}")
                        await page.go_back()
                    
                    await asyncio.sleep(3) # 뒤로가기 반영 대기

            except Exception as e:
                print(f"[Error] Month {month_name} scan failed: {e}")
                traceback.print_exc()
            finally:
                await page.close()

        for i in range(0, len(months), 2):
            pair = months[i:i+2]
            print(f"[Explore] >>> Running months in parallel: {pair}")
            await asyncio.gather(*[process_month(m) for m in pair])

        print("\n[Done] Scan finished. Keeping browser open for 10 seconds...")
        await asyncio.sleep(10)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_google_explore())
