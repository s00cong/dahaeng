# 트립닷컴 크롤링 저장 방식

이 문서는 `data/trip_com/trip_scraper.py`가 수집한 항공권 가격 데이터를 **어디에, 어떤 형식으로, 어떤 스키마로 저장하는지**를 설명한다.  
공유용 요약이라 실행 방법이나 크롤링 로직은 최소로 다룬다.

---

## 1) 저장 위치(디렉터리 구조)

데이터는 `data/trip_com/bronze_airticket/` 아래에 **수집 날짜/시간 단위로 파티셔닝**된다.

```
data/trip_com/bronze_airticket/
  dt=YYYY-MM-DD/
    hour=HH/
      all_cities.jsonl
      all_cities.csv
      failed_routes.json   (실패가 있을 때만 생성)
```

- `dt`는 수집 날짜(로컬 시간 기준).
- `hour`는 수집 시작 시각의 시(0~23).
- 예시: `data/trip_com/bronze_airticket/dt=2026-03-06/hour=01/`

---

## 2) 저장 파일과 역할

### A. `all_cities.jsonl`
**정규화된 원본 레코드(JSON Lines)**.  
한 줄이 1개의 가격 레코드이며, 향후 파이프라인에서 그대로 적재 가능한 형태를 목표로 한다.

#### JSONL 스키마
```json
{
  "dataset": "airticket",
  "schema_version": 1,
  "source": "trip_com",
  "ingest_time": "YYYY-MM-DDTHH:MM:SS",
  "event_time": "YYYY-MM-DD",
  "entity": {
    "city_code": "NEW_YORK",
    "city_name_kr": "뉴욕시",
    "origin": "ICN",
    "dest_airport": "JFK",
    "direction": "outbound"
  },
  "payload": {
    "price": 776200,
    "currency": "KRW"
  }
}
```

- `ingest_time`: 수집 시작 시각(로컬 시간, 초 단위)
- `event_time`: 항공권 출발일
- `direction`:
  - `outbound`: 인천(ICN) → 목적지
  - `inbound`: 목적지 → 인천(ICN)
- `price`는 정수(원화)

---

### B. `all_cities.csv`
**분석/검증용 CSV**.  
JSONL을 사람/도구가 바로 쓰기 쉽게 평탄화한 형태.

#### CSV 헤더
```
city_code,city_name_kr,country_kr,direction,dest_airport,date,price_krw,collected_date
```

#### 컬럼 의미
- `city_code`: 내부 도시 코드
- `city_name_kr`: 한글 도시명
- `country_kr`: 한글 국가명
- `direction`: `outbound` / `inbound`
- `dest_airport`: 목적지 공항 코드(예: JFK)
- `date`: 항공권 출발일 (`event_time`)
- `price_krw`: 가격(정수 원화)
- `collected_date`: 수집 날짜(`ingest_time`의 날짜 부분)

---

### C. `failed_routes.json`
**수집 실패한 노선 목록**.  
해당 수집 시간대에 끝까지 0건이었던 노선만 기록된다.

```json
[
  {
    "route_key": "NEW_YORK_JFK_out",
    "label": "서울 -> 뉴욕시 (JFK)",
    "dcity": "sel",
    "dairport": "icn",
    "acity": "nyc",
    "aairport": "jfk"
  }
]
```

---

## 3) 체크포인트(중복 수집 방지)

`data/trip_com/checkpoint.json`에 **수집 완료된 노선(route)**를 기록한다.  
같은 날짜(`dt`)에 대해 이미 완료된 노선은 재수집을 건너뛴다.

```json
{
  "date": "2026-03-06",
  "done": ["NEW_YORK_JFK_out", "NEW_YORK_JFK_in", "..."]
}
```

- 날짜가 바뀌면 자동으로 초기화된다(서로 다른 날짜는 재수집).
- 필요 시 환경 변수로 무시 가능: `IGNORE_CHECKPOINT=1`

---

## 4) 저장 흐름 요약

1. `city_airport_mapping.json`에서 도시/공항 매핑을 읽어 **모든 노선(route)**을 생성.
2. 각 노선별로 캘린더 가격을 수집(여러 달).
3. **레코드 생성 → `all_cities.jsonl` append**
4. **동일 내용을 평탄화하여 `all_cities.csv` append**
5. 정상 완료된 노선은 `checkpoint.json`에 기록.
6. 0건/실패 노선은 최종적으로 `failed_routes.json`에 저장.

---

## 5) 운영 팁(저장 관련)

- 결과 파일은 **append 방식**으로 계속 누적된다.  
  따라서 같은 시간대에 여러 번 실행하면 동일 파티션 내 파일이 계속 커진다.
- 파티션 기준은 **실행 시각**이며, 수집 대상 날짜(`event_time`)가 바뀌어도 저장 위치는 동일하다.
- `all_cities.csv`는 `utf-8-sig`로 저장되어 엑셀에서 바로 열기 쉽다.

---

## 6) 자주 보는 경로

```
data/trip_com/bronze_airticket/dt=YYYY-MM-DD/hour=HH/all_cities.jsonl
data/trip_com/bronze_airticket/dt=YYYY-MM-DD/hour=HH/all_cities.csv
data/trip_com/bronze_airticket/dt=YYYY-MM-DD/hour=HH/failed_routes.json
data/trip_com/checkpoint.json
```

