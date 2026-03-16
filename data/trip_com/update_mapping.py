import json
import os
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
WORLD_PATH = REPO_ROOT / "backend" / "world.md"
OUTPUT_PATH = REPO_ROOT / "data" / "trip_com" / "city_airport_mapping.json"
DESTINATIONS_PATH = REPO_ROOT / "data" / "google_flight" / "destinations.txt"
WORLD_DATA = json.loads(WORLD_PATH.read_text(encoding="utf-8"))

# Shared-airport cities need explicit canonical names instead of first-airport fallback.
CITY_NAME_OVERRIDES = {
    "KYOTO": ("Japan", "Kyoto"),
    "HAGUE": ("Netherlands", "The Hague"),
    "INTERLAKEN": ("Switzerland", "Interlaken"),
    "LUCERNE": ("Switzerland", "Lucerne"),
    "GENEVA": ("Switzerland", "Geneva"),
    "PLAYA": ("Mexico", "Playa Del Carmen"),
    "DENPASAR": ("Indonesia", "Denpasar"),
    "MALACCA": ("Malaysia", "Malacca"),
}


def apply_world_override(city_code, country_en, city_name_en):
    return CITY_NAME_OVERRIDES.get(city_code, (country_en, city_name_en))


def validate_world_mapping(country_en, city_name_en, city_code):
    if country_en not in WORLD_DATA:
        raise ValueError(f"{city_code}: unknown country '{country_en}' outside world.md")
    if city_name_en not in WORLD_DATA[country_en]:
        raise ValueError(
            f"{city_code}: city '{city_name_en}' is not listed under '{country_en}' in world.md"
        )

raw_data = """
## 🇺🇸 미국
- 뉴욕시 (JFK/LGA/EWR)
- 라스베이거스 (LAS)
- 로스앤젤레스 (LAX)
- 샌프란시스코 (SFO)
- 마이애미 (MIA)
- 시카고 (ORD/MDW)
- 워싱턴 (IAD/DCA)
- 하와이 (HNL)
- 괌 (GUM)
- 사이판 (SPN)
- 시애틀 (SEA)

## 🇻🇳 베트남
- 다낭 (DAD)
- 나트랑 (CXR)
- 푸꾸옥 (PQC)
- 하노이 (HAN)
- 호치민 (SGN)
- 하롱 (VDO/HPH)

## 🇯🇵 일본
- 도쿄 (HND/NRT)
- 오사카 (KIX/ITM)
- 교토 (KIX/ITM)
- 후쿠오카 (FUK)
- 삿포로 (CTS)
- 오키나와 (OKA)

## 🇨🇳 중국
- 상하이 (PVG/SHA)
- 베이징 (PEK/PKX)
- 칭다오 (TAO)
- 광저우 (CAN)
- 선전 (SZX)
- 하얼빈 (HRB)
- 장자제 (DYG)
- 홍콩 (HKG)
- 마카오 (MFM)

## 🇹🇭 태국
- 방콕 (BKK/DMK)
- 푸켓 (HKT)
- 치앙마이 (CNX)
- 파타야 (UTP)
- 끄라비 (KBV)

## 🇵🇭 필리핀
- 마닐라 (MNL)
- 세부 (CEB)
- 보라카이 (MPH/KLO)
- 푸에르토프린세사 (PPS)
- 다바오 (DVO)
- 일로일로 (ILO)
- 바기오 (CRK/MNL)
- 보홀 (TAG)

## 🇫🇷 프랑스
- 파리 (CDG/ORY)
- 니스 (NCE)
- 리옹 (LYS)
- 마르세유 (MRS)
- 보르도 (BOD)

## 🇷🇺 러시아
- 모스크바 (SVO/DME/VKO)
- 상트페테르부르크 (LED)
- 블라디보스토크 (VVO)

## 🇦🇺 호주
- 시드니 (SYD)
- 멜버른 (MEL)
- 브리즈번 (BNE)
- 골드코스트 (OOL)
- 퍼스 (PER)

## 🇹🇼 대만
- 타이베이 (TPE/TSA)
- 가오슝 (KHH)
- 타이중 (RMQ)

## 🇬🇧 영국
- 런던 (LHR/LGW/STN)
- 에든버러 (EDI)
- 맨체스터 (MAN)
- 리버풀 (LPL)

## 🇩🇪 독일
- 베를린 (BER)
- 뮌헨 (MUC)
- 프랑크푸르트 (FRA)
- 함부르크 (HAM)
- 쾰른 (CGN)

## 🇸🇬 싱가포르
- 싱가포르 (SIN)

## 🇮🇹 이탈리아
- 로마 (FCO)
- 베네치아 (VCE)
- 밀라노 (MXP/LIN)
- 피렌체 (FLR)
- 나폴리 (NAP)

## 🇳🇱 네덜란드
- 암스테르담 (AMS)
- 로테르담 (RTM)
- 헤이그 (RTM)

## 🇨🇭 스위스
- 취리히 (ZRH)
- 인터라켄 (ZRH/GVA)
- 루체른 (ZRH)
- 제네바 (GVA)

## 🇲🇾 말레이시아
- 쿠알라룸푸르 (KUL)
- 코타키나발루 (BKI)
- 랑카위 (LGK)
- 조호르바루 (JHB)
- 말라카 (KUL)
- 이포 (IPH)

## 🇨🇦 캐나다
- 밴쿠버 (YVR)
- 토론토 (YYZ)
- 몬트리올 (YUL)
- 퀘벡시티 (YQB)

## 🇰🇭 캄보디아
- 씨엠립 (SAI)
- 프놈펜 (PNH)
- 시아누크빌 (KOS)

## 🇲🇳 몽골
- 울란바토르 (UBN)
- 불간 (UGA/UBN)

## 🇳🇿 뉴질랜드
- 오클랜드 (AKL)
- 퀸스타운 (ZQN)
- 크라이스트처치 (CHC)

## 🇮🇳 인도
- 델리 (DEL)
- 뭄바이 (BOM)
- 아그라 (AGR/DEL)
- 자이푸르 (JAI)
- 고아 (GOI)

## 🇪🇸 스페인
- 바르셀로나 (BCN)
- 마드리드 (MAD)
- 세비야 (SVQ)
- 그라나다 (GRX)

## 🇧🇷 브라질
- 리우데자네이루 (GIG)
- 상파울루 (GRU)
- 포스두이구아수 (IGU)

## 🇲🇽 멕시코
- 칸쿤 (CUN)
- 멕시코시티 (MEX)
- 플라야델카르멘 (CUN)

## 🇭🇺 헝가리
- 부다페스트 (BUD)
- 데브레첸 (DEB)

## 🇫🇮 핀란드
- 헬싱키 (HEL)
- 로바니에미 (RVN)

## 🇹🇷 터키
- 이스탄불 (IST/SAW)
- 안탈리아 (AYT)

## 🇿🇦 남아프리카 공화국
- 케이프타운 (CPT)
- 요하네스버그 (JNB)
- 더반 (DUR)

## 🇮🇩 인도네시아
- 발리 (DPS)
- 자카르타 (CGK)
- 덴파사르 (DPS)
- 족자카르타 (YIA)
- 바탐 (BTH)

## 🇱🇦 라오스
- 비엔티안 (VTE)
- 루앙프라방 (LPQ)

## 🇨🇿 체코
- 프라하 (PRG)

## 🇦🇹 오스트리아
- 빈 (VIE)

## 🇭🇷 크로아티아
- 자그레브 (ZAG)

## 🇦🇪 아랍에미리트
- 두바이 (DXB)

## 🇲🇻 몰디브
- 말레 (MLE)

## 🇵🇹 포르투갈
- 리스본 (LIS)
- 포르투 (OPO)

## 🇶🇦 카타르
- 도하 (DOH)

## 🇬🇷 그리스
- 아테네 (ATH)

## 🇵🇱 폴란드
- 바르샤바 (WAW)

## 🇸🇪 스웨덴
- 스톡홀름 (ARN)

## 🇳🇴 노르웨이
- 오슬로 (OSL)

## 🇵🇪 페루
- 리마 (LIM)

## 🇪🇬 이집트
- 카이로 (CAI)

## 🇲🇺 모리셔스
- 포트루이스 (MRU)

## 🇮🇸 아이슬란드
- 레이캬비크 (KEF)

## 🇩🇰 덴마크
- 코펜하겐 (CPH)

## 🇧🇪 벨기에
- 브뤼셀 (BRU)

## 🇧🇴 볼리비아
- 라파스 (LPB)
- 우유니 (UYU)

## 🇦🇷 아르헨티나
- 부에노스아이레스 (EZE)

## 🇨🇱 칠레
- 산티아고 (SCL)

## 🇳🇵 네팔
- 카트만두 (KTM)

## 🇵🇼 팔라우
- 코로르 (ROR)

## 🇰🇿 카자흐스탄
- 알마티 (ALA)

## 🇲🇦 모로코
- 카사블랑카 (CMN)
- 마라케시 (RAK)

## 🇨🇺 쿠바
- 아바나 (HAV)

## 🇰🇪 케냐
- 나이로비 (NBO)
"""

city_code_map = {
    "뉴욕시": "NEW_YORK", "라스베이거스": "LAS_VEGAS", "로스앤젤레스": "LOS_ANGELES", "샌프란시스코": "SAN_FRANCISCO",
    "마이애미": "MIAMI", "시카고": "CHICAGO", "워싱턴": "WASHINGTON", "하와이": "HAWAII", "괌": "GUAM", "사이판": "SAIPAN", "시애틀": "SEATTLE",
    "다낭": "DANANG", "나트랑": "NHATRANG", "푸꾸옥": "PHUQUOC", "하노이": "HANOI", "호치민": "HOCHIMINH", "하롱": "HALONG",
    "도쿄": "TOKYO", "오사카": "OSAKA", "교토": "KYOTO", "후쿠오카": "FUKUOKA", "삿포로": "SAPPORO", "오키나와": "OKINAWA",
    "상하이": "SHANGHAI", "베이징": "BEIJING", "칭다오": "QINGDAO", "광저우": "GUANGZHOU", "선전": "SHENZHEN", "하얼빈": "HARBIN", "장자제": "ZHANGJIAJIE", "홍콩": "HONGKONG", "마카오": "MACAU",
    "방콕": "BANGKOK", "푸켓": "PHUKET", "치앙마이": "CHIANGMAI", "파타야": "PATTAYA", "끄라비": "KRABI",
    "마닐라": "MANILA", "세부": "CEBU", "보라카이": "BORACAY", "푸에르토프린세사": "PUERTO_P", "다바오": "DAVAO", "일로일로": "ILOILO", "바기오": "BAGUIO", "보홀": "BOHOL",
    "파리": "PARIS", "니스": "NICE", "리옹": "LYON", "마르세유": "MARSEILLE", "보르도": "BORDEAUX",
    "모스크바": "MOSCOW", "상트페테르부르크": "STPETERSBURG", "블라디보스토크": "VLADIVOSTOK",
    "시드니": "SYDNEY", "멜버른": "MELBOURNE", "브리즈번": "BRISBANE", "골드코스트": "GOLDCOAST", "퍼스": "PERTH",
    "타이베이": "TAIPEI", "가오슝": "KAOHSIUNG", "타이중": "TAICHUNG",
    "런던": "LONDON", "에든버러": "EDINBURGH", "맨체스터": "MANCHESTER", "리버풀": "LIVERPOOL",
    "베를린": "BERLIN", "뮌헨": "MUNICH", "프랑크푸르트": "FRANKFURT", "함부르크": "HAMBURG", "쾰른": "COLOGNE",
    "싱가포르": "SINGAPORE",
    "로마": "ROME", "베네치아": "VENICE", "밀라노": "MILAN", "피렌체": "FLORENCE", "나폴리": "NAPLES",
    "암스테르담": "AMSTERDAM", "로테르담": "ROTTERDAM", "헤이그": "HAGUE",
    "취리히": "ZRH", "인터라켄": "INTERLAKEN", "루체른": "LUCERNE", "제네바": "GENEVA", # fallback generic name
    "쿠알라룸푸르": "KUALA_LUMPUR", "코타키나발루": "KOTA_KINABALU", "랑카위": "LANGKAWI", "조호르바루": "JOHOR", "말라카": "MALACCA", "이포": "IPOH",
    "밴쿠버": "VANCOUVER", "토론토": "TORONTO", "몬트리올": "MONTREAL", "퀘벡시티": "QUEBEC",
    "씨엠립": "SIEM_REAP", "프놈펜": "PHNOM_PENH", "시아누크빌": "SIHANOUKVILLE",
    "울란바토르": "ULAANBAATAR", "불간": "BULGAN",
    "오클랜드": "AUCKLAND", "퀸스타운": "QUEENSTOWN", "크라이스트처치": "CHRISTCHURCH",
    "델리": "DELHI", "뭄바이": "MUMBAI", "아그라": "AGRA", "자이푸르": "JAIPUR", "고아": "GOA",
    "바르셀로나": "BARCELONA", "마드리드": "MADRID", "세비야": "SEVILLE", "그라나다": "GRANADA",
    "리우데자네이루": "RIO", "상파울루": "SAO_PAULO", "포스두이구아수": "IGUAZU",
    "칸쿤": "CANCUN", "멕시코시티": "MEXICO_CITY", "플라야델카르멘": "PLAYA",
    "부다페스트": "BUDAPEST", "데브레첸": "DEB",
    "헬싱키": "HELSINKI", "로바니에미": "ROVANIEMI",
    "이스탄불": "ISTANBUL", "안탈리아": "ANTALYA",
    "케이프타운": "CAPE_TOWN", "요하네스버그": "JOHANNESBURG", "더반": "DURBAN",
    "발리": "BALI", "자카르타": "JAKARTA", "덴파사르": "DENPASAR", "족자카르타": "YOGYAKARTA", "바탐": "BATAM",
    "비엔티안": "VIENTIANE", "루앙프라방": "LUANG_PRABANG",
    "프라하": "PRAGUE",
    "빈": "VIENNA",
    "자그레브": "ZAGREB",
    "두바이": "DUBAI",
    "말레": "MALE",
    "리스본": "LISBON", "포르투": "PORTO",
    "도하": "DOHA",
    "아테네": "ATHENS",
    "바르샤바": "WARSAW",
    "스톡홀름": "STOCKHOLM",
    "오슬로": "OSLO",
    "리마": "LIMA",
    "카이로": "CAIRO",
    "포트루이스": "PORT_LOUIS",
    "레이캬비크": "REYKJAVIK",
    "코펜하겐": "COPENHAGEN",
    "브뤼셀": "BRUSSELS",
    "라파스": "LA_PAZ", "우유니": "UYUNI",
    "부에노스아이레스": "BUENOS_AIRES",
    "산티아고": "SANTIAGO",
    "카트만두": "KATHMANDU",
    "코로르": "KOROR",
    "알마티": "ALMATY",
    "카사블랑카": "CASABLANCA", "마라케시": "MARRAKESH",
    "아바나": "HAVANA",
    "나이로비": "NAIROBI"
}

def clean_city_name(name):
    # Some internal mapping for trip_city since the crawler uses trip_city matching
    name = name.lower()
    mapping = {
        'jfk': 'nyc', 'lga': 'nyc', 'ewr': 'nyc',
        'ord': 'chi', 'mdw': 'chi',
        'iad': 'was', 'dca': 'was',
        'nrt': 'tyo', 'hnd': 'tyo',
        'kix': 'osa', 'itm': 'osa',
        'bkk': 'bkk', 'dmk': 'bkk',
        'pvg': 'sha', 'sha': 'sha',
        'pek': 'bjs', 'pkx': 'bjs',
        'lhr': 'lon', 'lgw': 'lon', 'stn': 'lon',
        'cdg': 'par', 'ory': 'par',
        'cxr': 'nha', 'cts': 'spk',
        'svo': 'mow', 'dme': 'mow', 'vko': 'mow',
        'tsa': 'tpe', 'fco': 'rom',
        'mxp': 'mil', 'lin': 'mil',
        'yyz': 'yto', 'yul': 'ymq',
        'uga': 'uln', 'ubn': 'uln', 'gig': 'rio', 'gru': 'sao',
        'saw': 'ist', 'cgk': 'jkt', 'yia': 'jog',
        'arn': 'sto', 'kef': 'rek', 'eze': 'bue'
    }
    return mapping.get(name, name)

results = []
current_country = ""
lines = raw_data.strip().splitlines()

all_airports = set()

# Load English Mapping to attach country_en and city_name_en
eng_mapping_path = os.path.join(os.path.dirname(__file__), "en_city_airport_mapping.json")
try:
    with open(eng_mapping_path, "r", encoding="utf-8") as eng_f:
        en_mapping = json.load(eng_f)
except Exception as e:
    print(f"Warning: Could not load {eng_mapping_path}. Error: {e}")
    en_mapping = {}

# Build reverse mapping: apt -> (country_en, city_en)
airport_to_en = {}
for country, cities in en_mapping.items():
    for city, airports in cities.items():
        for apt in airports:
            if apt not in airport_to_en:
                airport_to_en[apt] = (country, city)

for line in lines:
    line = line.strip()
    if not line: continue
    if line.startswith('##'):
        current_country = line.replace('##', '').strip().split(' ', 1)[-1].strip()
    elif line.startswith('-'):
        m = re.match(r'- ([^\s]+)\s+\(([^)]+)\)', line)
        if m:
            city_kr = m.group(1).strip()
            airports = m.group(2).split('/')
            city_code = city_code_map.get(city_kr, "UNKNOWN_CITY")
            
            routes = []
            country_en = "UNKNOWN_COUNTRY"
            city_name_en = city_code

            for apt in airports:
                apt = apt.strip().upper()
                all_airports.add(apt)
                
                # Try setting EN names from first known airport in this city block
                if country_en == "UNKNOWN_COUNTRY" and apt in airport_to_en:
                    country_en, city_name_en = airport_to_en[apt]
                
                routes.append({
                    "trip_city": clean_city_name(apt.lower()),
                    "airport": apt,
                    "trip_airport": apt.lower()
                })

            country_en, city_name_en = apply_world_override(
                city_code,
                country_en,
                city_name_en,
            )
            validate_world_mapping(country_en, city_name_en, city_code)
                
            results.append({
                "city_code": city_code,
                "city_name_kr": city_kr,
                "city_name_en": city_name_en,
                "country_kr": current_country,
                "country_en": country_en,
                "routes": routes
            })

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=4)

print("Generated mapping json.")
with open(DESTINATIONS_PATH, "w", encoding="utf-8") as f:
    f.write(",".join(sorted(list(all_airports))))
print("Also exported airport destinations for google_flight.")
