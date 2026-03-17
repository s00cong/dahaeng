# Trip.com JSONL을 Hadoop(HDFS)에 저장하고 Spark로 처리하는 방법

이 문서는 현재 로컬에 저장 중인 Trip.com 크롤링 결과를 HDFS에 올리고, Spark로 읽어 Silver 레이어까지 처리하는 가장 실무적인 흐름을 정리한 문서다.

기준 로컬 경로 예시는 아래와 같다.

```text
C:\Users\SSAFY\Desktop\soob\S14P21D206\ai\trip_com\bronze_airticket\dt=2026-03-08\hour=15\all_cities.jsonl
```

현재 저장 구조는 이미 Bronze 레이어처럼 잘 나뉘어 있다.
그래서 가장 좋은 방법은 JSONL 원본을 그대로 HDFS Bronze 경로로 옮기고, Spark에서 바로 `read.json(...)`으로 읽는 것이다.

---

## 1. 권장 구조

### 1) 로컬 구조

```text
data/trip_com/bronze_airticket/
  dt=2026-03-08/
    hour=15/
      all_cities.jsonl
    hour=17/
      all_cities.jsonl
```

### 2) HDFS 구조

로컬 구조를 최대한 그대로 유지하는 것을 권장한다.

```text
/data/bronze/airticket/trip_com/
  dt=2026-03-08/
    hour=15/
      all_cities.jsonl
    hour=17/
      all_cities.jsonl
```

이렇게 두면:

- `dt` 단위로 일자 관리가 쉽고,
- `hour` 단위 재처리도 가능하고,
- 원본 JSONL을 그대로 보관하는 Bronze 목적에도 맞다.

`all_cities.csv`는 사람이 확인하기 위한 파일이므로 HDFS Bronze 적재 대상에서는 제외해도 된다.
`failed_routes.json`은 운영 추적용이라 필요할 때만 별도 보관하면 된다.

---

## 2. 왜 JSONL을 그대로 올리면 되나

현재 `all_cities.jsonl`은 한 줄에 한 건씩 JSON 객체가 들어 있는 JSON Lines 형식이다.
Spark는 이 포맷을 그대로 읽을 수 있다.

```python
df = spark.read.json("/data/bronze/airticket/trip_com/dt=2026-03-08/hour=*/all_cities.jsonl")
```

즉, 별도 CSV 변환이나 전처리 없이도 바로 DataFrame으로 만들 수 있다.

---

## 3. HDFS에 올리는 절차

### 3.1 전제 조건

아래 중 하나는 준비되어 있어야 한다.

- Hadoop 클라이언트가 설치된 머신에서 `hdfs dfs` 명령을 실행할 수 있어야 한다.
- 또는 로컬 파일을 Hadoop edge node로 먼저 복사한 뒤, edge node에서 `hdfs dfs`를 실행할 수 있어야 한다.

Windows 로컬 경로를 바로 쓰는 예시를 먼저 보여주고, 환경이 안 되면 같은 흐름을 Linux edge node에서 실행하면 된다.
`hdfs dfs -put` 대신 `hdfs dfs -copyFromLocal`을 써도 같은 용도로 볼 수 있다.

### 3.2 하루치 디렉터리 생성

```bash
hdfs dfs -mkdir -p /data/bronze/airticket/trip_com/dt=2026-03-08/hour=15
hdfs dfs -mkdir -p /data/bronze/airticket/trip_com/dt=2026-03-08/hour=17
```

### 3.3 PowerShell로 시간대별 JSONL 업로드

```powershell
$base = "C:\Users\SSAFY\Desktop\soob\S14P21D206\ai\trip_com\bronze_airticket\dt=2026-03-08"
$hdfsBase = "/data/bronze/airticket/trip_com/dt=2026-03-08"

Get-ChildItem $base -Directory | ForEach-Object {
    $hourDir = $_.Name
    $localJsonl = Join-Path $_.FullName "all_cities.jsonl"

    if (Test-Path $localJsonl) {
        hdfs dfs -mkdir -p "$hdfsBase/$hourDir"
        hdfs dfs -put -f $localJsonl "$hdfsBase/$hourDir/"
    }
}
```

위 스크립트는 `hour=15`, `hour=17` 같은 폴더를 순회하면서 `all_cities.jsonl`만 HDFS로 올린다.

### 3.4 업로드 확인

```bash
hdfs dfs -ls -R /data/bronze/airticket/trip_com/dt=2026-03-08
```

또는 파일 일부를 직접 확인할 수 있다.

```bash
hdfs dfs -cat /data/bronze/airticket/trip_com/dt=2026-03-08/hour=15/all_cities.jsonl | head
```

---

## 4. Spark에서 바로 읽어보기

아래는 가장 단순한 확인용 예시다.

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, to_date

spark = SparkSession.builder.appName("trip-com-jsonl-check").getOrCreate()

raw_path = "/data/bronze/airticket/trip_com/dt=2026-03-08/hour=*/all_cities.jsonl"
df = spark.read.json(raw_path)

df.select(
    col("entity.city_code").alias("city_code"),
    col("entity.dest_airport").alias("dest_airport"),
    col("entity.direction").alias("direction"),
    to_date(col("event_time")).alias("departure_date"),
    col("payload.price").cast("int").alias("price_krw"),
).show(20, truncate=False)
```

간단한 집계 예시는 아래처럼 할 수 있다.

```python
from pyspark.sql.functions import avg

(
    df.select(
        col("entity.city_code").alias("city_code"),
        col("payload.price").cast("int").alias("price_krw"),
    )
    .groupBy("city_code")
    .agg(avg("price_krw").cast("int").alias("avg_price_krw"))
    .show(truncate=False)
)
```

만약 나중에 Spark에서 `dt`, `hour`를 파티션 컬럼으로 직접 활용하고 싶다면, 파티션 루트를 기준으로 읽거나 `basePath`를 같이 주는 방식이 더 안전하다.

```python
df = (
    spark.read
    .option("basePath", "/data/bronze/airticket/trip_com")
    .json("/data/bronze/airticket/trip_com/dt=2026-03-08/hour=*/all_cities.jsonl")
)
```

---

## 5. 이 레포의 기존 Spark 파이프라인과 연결하는 방법

이 레포에는 이미 Trip.com Bronze를 Silver로 바꾸는 코드가 있다.

- `data/spark_pipeline/etl_bronze_to_silver_v2.py`

여기서 Trip.com 입력 경로는 현재 아래처럼 되어 있다.

```python
raw_path = f"/data/bronze/airticket/trip_com/dt={run_date}/*.jsonl"
```

그런데 현재 로컬 원본 구조는 `dt=날짜/hour=시간/all_cities.jsonl` 형태다.
즉, HDFS에도 이 구조를 그대로 유지하면 Spark 입력 경로를 한 단계 더 내려서 읽어야 한다.

### 권장 변경

```python
raw_path = f"/data/bronze/airticket/trip_com/dt={run_date}/hour=*/all_cities.jsonl"
```

이렇게 바꾸면 지금 크롤러가 만드는 구조와 HDFS 구조가 자연스럽게 맞는다.

---

## 6. Spark 배치 실행 예시

입력 경로를 위처럼 맞춘 뒤에는 아래처럼 실행하면 된다.

```bash
spark-submit data/spark_pipeline/etl_bronze_to_silver_v2.py 2026-03-08
```

이 스크립트는 Trip.com 데이터로 아래 Silver 산출물을 만든다.

- `/data/silver/airticket/calendar_price_daily`
- `/data/silver/airticket/city_month_flight_price`

그리고 Google Flights 데이터가 같은 날짜 기준으로 함께 존재하면 아래도 이어서 만든다.

- `/data/silver/airticket/city_month_hotel_price`
- `/data/silver/airticket/city_month_travel_profile`
- `/data/silver/airticket/city_month_budget_base`

즉, 현재 날짜에 Trip.com만 올려 둔 상태라면 최소한 항공권 기반 Silver 테이블은 생성할 수 있다.

---

## 7. 운영 관점에서 추천하는 흐름

실무적으로는 아래 흐름을 추천한다.

1. 크롤러가 로컬에 `all_cities.jsonl` 생성
2. 수집 완료 후 `dt=.../hour=.../all_cities.jsonl`만 HDFS Bronze로 업로드
3. Spark 배치가 해당 날짜의 Bronze JSONL을 읽음
4. Silver Parquet로 저장
5. 이후 Gold 집계 또는 Backend용 적재에 사용

이 흐름의 장점은 다음과 같다.

- 원본(JSONL)과 분석용 결과(Parquet)가 분리된다.
- 장애가 나도 Bronze만 남아 있으면 재처리가 쉽다.
- 날짜별, 시간대별 재실행 범위를 통제하기 쉽다.

---

## 8. 자주 생기는 문제

### 1) Spark가 파일을 못 읽는 경우

가장 흔한 원인은 경로 패턴이 실제 디렉터리 구조와 다를 때다.

- 실제 구조: `/dt=2026-03-08/hour=15/all_cities.jsonl`
- 잘못된 패턴: `/dt=2026-03-08/*.jsonl`
- 올바른 패턴: `/dt=2026-03-08/hour=*/all_cities.jsonl`

### 2) 작은 파일이 너무 많아지는 경우

시간대별 파일이 계속 쌓이면 small files 문제가 생길 수 있다.
초기에는 그대로 운영해도 되지만, 나중에는 일 단위 compaction job을 두는 것이 좋다.

### 3) CSV까지 같이 올려야 하는지 헷갈리는 경우

분석 파이프라인 기준으로는 JSONL만 있으면 충분하다.
CSV는 검증용 산출물에 가깝다.

---

## 9. 결론

지금 구조에서는 다음처럼 가면 된다.

1. `all_cities.jsonl`을 HDFS의 `/data/bronze/airticket/trip_com/dt=.../hour=.../` 아래로 업로드한다.
2. Spark는 `/data/bronze/airticket/trip_com/dt=.../hour=*/all_cities.jsonl` 패턴으로 읽는다.
3. 기존 `data/spark_pipeline/etl_bronze_to_silver_v2.py`의 Trip.com 입력 경로만 현재 구조에 맞게 조정해서 실행한다.

즉, 원본 포맷은 이미 충분히 좋고, 핵심은 HDFS 경로 설계와 Spark 입력 경로를 일치시키는 것이다.

