# Overture V1 관광지 선별 및 태그 점수화 문서

## 개요

이 문서는 기존 Overture V1 파이프라인이 어떤 방식으로 관광지(POI)를 선별하고, 각 POI 및 도시에 태그 점수를 부여하는지 설명한다.  
기준 코드는 [`bronze_to_silver_overture.py`](/home/ubuntu/app/bronze_to_silver_overture.py)이다.

V1의 핵심 목적은 다음과 같다.

- Overture 원천 place 데이터에서 관광지로 볼 수 있는 장소를 추린다.
- 장소별 감성/여행 태그 점수를 계산한다.
- 장소 점수를 바탕으로 도시별 태그 점수를 집계한다.


## 전체 흐름

V1 파이프라인은 크게 아래 순서로 동작한다.

1. HDFS의 Overture Bronze 데이터를 읽는다.
2. 대상 도시 범위 안에 있는 POI만 남긴다.
3. 신뢰도, 이름 유무, 카테고리 조건으로 1차 필터링한다.
4. 카테고리별 태그 가중치로 POI 태그 점수를 만든다.
5. 유명도 점수와 메타데이터 보너스를 더해 최종 POI 점수를 만든다.
6. 기준 점수 이상인 POI만 최종 관광지 후보로 채택한다.
7. 살아남은 POI를 도시별로 묶어 도시 태그 점수를 만든다.


## 입력 데이터와 산출물

### 입력

- HDFS Bronze 경로: `hdfs://127.0.0.1:9000/data/bronze/overture`

### 출력

- POI Silver: `hdfs://127.0.0.1:9000/data/silver/poi_tag_scores_v2`
- City Silver: `hdfs://127.0.0.1:9000/data/silver/city_tag_scores_v2`


## 1. 관광지 후보 필터링 방식

V1은 Overture 원본을 그대로 쓰지 않고, 관광지 후보가 될 수 있는 장소만 먼저 남긴다.

### 1) 신뢰도 필터

- `CONFIDENCE_THRESHOLD = 0.90`
- confidence가 0.90 미만이면 제외한다.

의도:

- Overture 원본 중 신뢰도가 낮은 장소를 제거해 노이즈를 줄이기 위함

예시:

- confidence 0.95인 `museum`은 통과 가능
- confidence 0.72인 `museum`은 탈락


### 2) 대상 도시 반경 필터

코드 내부의 `target_cities` 목록을 기준으로, 각 장소의 중심 좌표가 특정 도시의 기준 좌표 근처에 있으면 그 도시 소속으로 본다.

- `CITY_MATCH_THRESHOLD = 0.25`

의도:

- 서비스에서 관리하는 도시 범위 밖 장소를 제외하기 위함

예시:

- 뉴욕 기준 좌표 근처의 장소는 `real_city_name = "New York City"`
- 어떤 도시 반경에도 속하지 않으면 `Unknown`으로 처리되고 제외


### 3) 이름/카테고리 필터

아래 조건을 만족해야 한다.

- `place_name`이 null이 아니어야 함
- 공백 제거 후 이름 길이가 1 초과여야 함
- `categories.primary`가 null이 아니어야 함

의도:

- 이름 없는 점 데이터나 의미 없는 레코드를 제거하기 위함


### 4) 제외 카테고리 필터

관광지와 거리가 먼 카테고리는 제거한다.

대표 제외 카테고리:

- `atm`
- `bank`
- `bus_station`
- `clinic`
- `hospital`
- `parking`
- `pharmacy`
- `school`
- `supermarket`
- `hotel`
- `motel`

의도:

- 생활 편의시설, 교통시설, 의료시설, 숙박시설을 관광지 후보에서 제외하기 위함

예시:

- `museum`, `castle`, `beach`, `viewpoint`는 통과 가능
- `atm`, `parking`, `hospital`은 즉시 탈락


## 2. POI 태그 점수 계산 방식

V1은 각 POI에 대해 여러 여행 태그 점수를 동시에 계산한다.  
기준은 `tag_weights` 사전에 정의된 "카테고리 -> 태그 가중치" 매핑이다.

### 태그 예시

- `자유로운`
- `힙한`
- `로컬감성`
- `전통적인`
- `푸른바다`
- `초록자연`
- `미식여행`
- `사진맛집`
- `가족과`

### 계산 원리

각 태그마다, 현재 POI의 primary category가 해당 태그의 매핑 카테고리와 일치하면:

- `태그 점수 = 카테고리 가중치 x confidence`

### 예시 1. 해변 관광지

가정:

- 장소명: `Oak Street Beach`
- 카테고리: `beach`
- confidence: `0.95`

관련 태그 예시:

- `푸른바다`: `beach = 1.0`
- `자유로운`: `beach = 0.8`
- `초록자연`: `beach = 0.5`
- `사진맛집`: `beach = 0.8`

계산:

- `poi_score_푸른바다 = 1.0 x 0.95 = 0.95`
- `poi_score_자유로운 = 0.8 x 0.95 = 0.76`
- `poi_score_초록자연 = 0.5 x 0.95 = 0.475`
- `poi_score_사진맛집 = 0.8 x 0.95 = 0.76`

즉 하나의 POI가 여러 태그 점수를 동시에 가질 수 있다.


### 예시 2. 역사 관광지

가정:

- 장소명: `Gyeongbokgung Palace`
- 카테고리: `palace`
- confidence: `0.97`

관련 태그 예시:

- `전통적인`: `palace = 1.0`
- `역사적인`: `palace = 1.0`
- `사진맛집`: `palace = 0.9`

계산:

- `poi_score_전통적인 = 0.97`
- `poi_score_역사적인 = 0.97`
- `poi_score_사진맛집 = 0.873`


## 3. 유명도 점수(fame_score)

V1은 단순 태그 점수 외에, 관광지 대표성에 가까운 카테고리에 추가 점수를 준다.

예시 가중치:

- `landmark_and_historical_building = 0.30`
- `castle = 0.30`
- `monument = 0.28`
- `museum = 0.22`
- `viewpoint = 0.20`
- `beach = 0.16`

계산 방식:

- `fame_score = fame_category_weight x confidence`

예시:

- 장소: `Eiffel Tower`
- 카테고리: `tower`
- confidence: `0.96`
- tower 가중치: `0.24`

계산:

- `fame_score = 0.24 x 0.96 = 0.2304`

의도:

- 일반 가게나 생활 시설보다 "대표 관광지다운 장소"에 우선순위를 주기 위함


## 4. 메타데이터 보너스(metadata_bonus)

POI가 부가 메타데이터를 가질수록 추가 보너스를 준다.

규칙:

- website 있으면 `+0.04`
- social 있으면 `+0.03`
- address 있으면 `+0.03`
- 최대 보너스는 `0.10`

예시:

- 웹사이트 있음
- SNS 있음
- 주소 있음

계산:

- `metadata_bonus = 0.04 + 0.03 + 0.03 = 0.10`

의도:

- 정보가 풍부한 장소일수록 신뢰도와 활용도가 높다고 보기 때문


## 5. 최종 POI 점수(poi_final_score)

최종 점수는 아래 세 요소를 합친 값이다.

- `total_tag_score`
- `fame_score`
- `metadata_bonus`

공식:

- `poi_final_score = total_tag_score + fame_score + metadata_bonus`

### 예시

가정:

- 태그 점수 합: `3.00`
- fame_score: `0.152`
- metadata_bonus: `0.10`

계산:

- `poi_final_score = 3.252`

### 최종 선별 기준

- `TAG_SCORE_THRESHOLD = 0.80`

즉 `poi_final_score >= 0.80`인 POI만 최종 관광지 후보에 포함된다.


## 6. POI 중복 제거 방식

최종 POI는 아래 조합 기준으로 중복 제거된다.

- `real_city_name`
- `place_name`
- `lat`
- `lon`

의미:

- 이름과 좌표가 완전히 같은 중복은 제거
- 이름이 조금 다르거나 좌표가 약간 다르면 남을 수 있음

예시:

- `Statue of Liberty` / 좌표 A
- `The Statue of Liberty` / 좌표 A 근처

이 경우 완전히 동일하지 않으면 둘 다 남을 가능성이 있다.


## 7. 도시 태그 점수 집계 방식

V1은 살아남은 POI를 도시별로 묶어서 도시 태그 점수를 계산한다.

도시 집계 시 태그별로 아래를 계산한다.

- 점수 합
- 가중 평균용 분모
- 해당 태그를 가진 POI 개수

가중 방식의 핵심:

- 태그 점수가 있는 POI만 집계에 참여
- `fame_score`가 높은 POI일수록 조금 더 높은 비중을 가짐
- 해당 태그를 가진 POI 수가 많을수록 `log1p(count)` 보정으로 약간 유리해짐

도시 점수 형태:

- `(weighted_sum / weight_sum) x log1p(count)`

의도:

- 태그 점수가 높고
- 관련 관광지가 많이 존재하는 도시를
- 해당 분위기/테마가 강한 도시로 보기 위함


## 8. 도시 점수 예시

예를 들어 어떤 도시의 `푸른바다` 관련 POI가 아래처럼 있다고 가정한다.

- Beach A: 점수 0.95, fame 높음
- Beach B: 점수 0.90
- Beach C: 점수 0.88
- Marina D: 점수 0.82

이 경우:

- 단순 평균만 보는 것이 아니라
- fame_score가 높은 POI가 조금 더 강하게 반영되고
- 관련 POI 개수도 보정에 들어간다

그래서 해변/마리나가 많고 점수도 높은 도시는 `푸른바다` 도시 점수가 높아진다.


## 9. 기후 태그 점수 산정 방식

주의:

- 이 점수는 `bronze_to_silver_overture.py`의 Overture 관광지 점수와는 별도다.
- 실제 추천 점수 계산 시, 도시별 일반 태그 점수와 함께 사용되는 월별 기후 태그 점수다.
- 기준 코드는 아래 두 파일이다.
- [`S14P21D206/data/climate/bronze_to_silver_climate.py`](/home/ubuntu/app/S14P21D206/data/climate/bronze_to_silver_climate.py)
- [`S14P21D206/data/climate/load_to_db_climate.py`](/home/ubuntu/app/S14P21D206/data/climate/load_to_db_climate.py)

### 1) 기후 태그 종류

현재 서비스에서 사용하는 기후 태그는 아래 8개다.

- `따뜻한곳`
- `추운곳`
- `눈과함께`
- `사계절`
- `건조한`
- `습한`
- `열대`
- `온화한`

즉 기후 태그는 일반 여행 취향 태그와 별도 축으로 관리된다.


### 2) 입력 데이터

기후 점수는 Bronze 기후 데이터에서 아래 값들을 읽어 월별 통계로 만든다.

- `avg_temp_mean`
- `avg_temp_max`
- `avg_temp_min`
- `total_precip_mm`
- `avg_solar_radiation_kj_m2_day`
- `wind_speed_m_s`
- `vapor_pressure_kpa`
- `sample_days`

전처리 규칙:

- `source == "worldclim"` 데이터만 사용
- `month`가 있는 데이터만 사용
- 도시/월 단위로 평균 또는 합계를 집계


### 3) 보조 지표 계산

기후 태그를 바로 계산하지 않고, 먼저 0~1 범위의 보조 지표를 만든다.

대표 예시:

- `warm_temp_score`
- `cold_temp_score`
- `low_precip_score`
- `high_precip_score`
- `vapor_score`
- `dry_air_score`
- `sunshine_score`
- `comfort_temp_score`
- `snow_proxy_score`
- `frost_score`
- `seasonality_score`

공통 원리:

- 각 보조 지표는 `clamp01`로 0~1 범위로 자른다.
- 즉 너무 크거나 작은 값이 들어와도 최종적으로 0 미만, 1 초과로 가지 않도록 제한한다.


### 4) 기후 태그 점수 계산 공식

각 기후 태그는 위 보조 지표들의 가중합으로 계산된다.

예시 1. `따뜻한곳`

- `0.45 x warm_temp_score`
- `0.25 x sunshine_score`
- `0.15 x (1 - high_precip_score)`
- `0.15 x (1 - snow_proxy_score)`

즉:

- 평균 기온이 높고
- 햇빛이 좋고
- 강수량과 눈 가능성이 낮을수록
- `따뜻한곳` 점수가 올라간다.

예시 2. `추운곳`

- `0.45 x cold_temp_score`
- `0.35 x frost_score`
- `0.15 x wind_cold_score`
- `0.05 x (1 - warm_temp_score)`

즉:

- 평균 기온이 낮고
- 최저기온이 낮고
- 바람까지 차가울수록
- `추운곳` 점수가 올라간다.

예시 3. `건조한`

- `0.55 x low_precip_score`
- `0.35 x dry_air_score`
- `0.10 x (1 - high_precip_score)`

즉:

- 비가 적고
- 공기 중 수증기 압력이 낮을수록
- `건조한` 점수가 올라간다.

예시 4. `온화한`

- `0.55 x comfort_temp_score`
- `0.20 x (1 - abs(high_precip_score - 0.35))`
- `0.15 x sunshine_score`
- `0.10 x (1 - abs(warm_temp_score - 0.45))`

즉:

- 너무 덥지도 춥지도 않은 기온대이고
- 비가 과도하지 않고
- 햇빛이 어느 정도 확보될수록
- `온화한` 점수가 올라간다.


### 5) 결과 스케일

각 기후 태그 점수는 소수점 넷째 자리까지 반올림된다.

- 최종 점수 범위는 사실상 `0.0 ~ 1.0`
- 추천 서비스는 이 값을 일반 태그 점수와 함께 평균 계산에 사용한다.

의미:

- 기후 태그도 일반 태그와 비슷하게 0~1 스케일의 선호 점수로 관리된다고 보면 된다.


### 6) 저장 방식

계산된 결과는 도시/월/태그별 long 형태로 펼쳐 저장된다.

예시:

- `city_name = Tokyo`
- `month = 4`
- `tag_name = 온화한`
- `score = 0.7821`

그 후 DB 적재 단계에서 `city_climate_tag` 테이블에 들어간다.

의도:

- 추천 시 사용자가 선택한 월에 맞는 기후 태그 점수만 조회하기 위함


## 10. 뉴스 페널티 점수 산정 방식

주의:

- 이 점수는 `bronze_to_silver_overture.py`의 Overture 관광지 점수와는 별도다.
- 실제 추천 점수 계산 시, 뉴스 데이터 파이프라인과 추천 서비스에서 함께 사용된다.
- 기준 코드는 아래 두 파일이다.
- [`S14P21D206/data/news/silver_to_gold_gdelt.py`](/home/ubuntu/app/S14P21D206/data/news/silver_to_gold_gdelt.py)
- [`S14P21D206/backend/dahaeng/src/main/java/com/example/dahaeng/domain/recommend/service/RecommendationScoreCalculator.java`](/home/ubuntu/app/S14P21D206/backend/dahaeng/src/main/java/com/example/dahaeng/domain/recommend/service/RecommendationScoreCalculator.java)

### 1) 뉴스 집계 대상

뉴스 Silver 적재 단계에서 최근 7일 데이터만 남긴다.

- 기준 코드: [`S14P21D206/data/news/bronze_to_silver_gdelt.py`](/home/ubuntu/app/S14P21D206/data/news/bronze_to_silver_gdelt.py)
- 조건식: `news_date >= date_sub(current_date(), 6)`

즉 오늘 포함 최근 7일치 뉴스만 도시별 뉴스 페널티 계산에 사용된다.


### 2) 부정 뉴스 판정 기준

각 뉴스는 GDELT의 `payload.v2tone` 첫 번째 값을 `sentiment`로 사용한다.

- `sentiment < 0` 이면 부정 뉴스로 본다.
- `sentiment >= 0` 이면 부정 뉴스로 세지 않는다.

즉 감정 점수가 음수인 기사 수만 패널티 계산의 분자에 들어간다.


### 3) 도시별 원천 뉴스 페널티 점수

도시별로 아래 값을 집계한다.

- `city_total_news_7d`: 최근 7일 전체 뉴스 수
- `city_negative_news_7d`: 최근 7일 부정 뉴스 수
- `city_negative_ratio = city_negative_news_7d / city_total_news_7d`
- 뉴스가 0건이면 `city_negative_ratio = 0.0`

그 다음 원천 뉴스 페널티 점수는 아래처럼 계산한다.

- `news_penalty_score = round(city_negative_ratio x 100, 1)`

즉 이 값은 0~100 스케일의 "최근 7일 부정 뉴스 비율 퍼센트"에 가깝다.

예시 1:

- 전체 뉴스 20건
- 부정 뉴스 5건
- `city_negative_ratio = 5 / 20 = 0.25`
- `news_penalty_score = 25.0`

예시 2:

- 전체 뉴스 0건
- 부정 뉴스 0건
- `city_negative_ratio = 0.0`
- `news_penalty_score = 0.0`


### 4) 추천 점수 반영 시 실제 감점값

추천 서비스에서는 위 `news_penalty_score`를 그대로 더하지 않고, 최대 15점까지만 감점한다.

공식:

- `newsPenaltyScore = -min(15.0, max(0.0, cityNewsPenaltyScore))`

의미:

- 음수 값이 들어와도 최소 0으로 보정
- 15보다 큰 값은 15로 잘라냄
- 최종적으로 추천 점수에는 `0 ~ -15` 범위의 감점으로 반영

예시:

- 도시 원천 뉴스 페널티가 `4.2`면 추천 감점은 `-4.2`
- 도시 원천 뉴스 페널티가 `25.0`이면 추천 감점은 `-15.0`
- 도시 원천 뉴스 페널티가 `null`이면 추천 감점은 `0.0`


### 5) 최종 추천 점수와의 관계

추천 서비스 최종 점수는 아래처럼 계산된다.

- `finalScore = clamp(tagScore + budgetScore + safetyScore + newsPenaltyScore, 0, 100)`

즉 뉴스 페널티는:

- 태그 점수, 예산 점수, 안전 점수에 마지막으로 합산되는 감점 항목이며
- 최근 7일 부정 뉴스 비율이 높을수록 추천 순위를 낮추는 역할을 한다.


## 11. 기존 버전의 장점

- 구조가 비교적 단순해서 설명과 운영이 쉬움
- Overture 데이터만으로도 관광지 후보를 대량 생성 가능
- POI 점수와 도시 점수를 한 번에 만들 수 있음
- 메타데이터가 풍부한 장소를 우대하는 기본 장치가 있음


## 12. 기존 버전의 한계

- Wikidata 검증이 없음
- 이미지 URL 보강이 없음
- 실제 대표 관광지인지 2차 확인이 약함
- 도시별 결과가 특정 카테고리에 쏠릴 수 있음
- 이름이 조금 다른 중복 장소를 완벽히 제거하지 못할 수 있음


## 발표용 요약

기존 Overture V1은 원천 place 데이터에서 신뢰도 높은 장소만 골라내고, 카테고리별 태그 가중치에 confidence를 곱해 장소별 태그 점수를 계산한다. 여기에 관광지 대표성을 반영하는 유명도 점수와 웹사이트/SNS/주소 기반 메타데이터 보너스를 추가해 최종 관광지 점수를 만든다. 이후 기준 점수 이상인 장소만 남기고, 이를 도시별로 집계해 도시 태그 점수를 산출한다. 별도로 추천 단계에서는 월별 기후 데이터를 바탕으로 `city_climate_tag` 점수를 만들고, 최근 7일 뉴스 중 부정 기사 비율은 도시별 `news_penalty_score`로 만들어 최대 15점까지 감점해 최종 추천 순위에 반영한다.
