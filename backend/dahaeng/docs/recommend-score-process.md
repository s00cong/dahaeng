# 추천 점수 산정 프로세스 문서

## 1. 이 문서의 목적

이 문서는 우리 서비스가 도시 추천 시 어떤 입력을 받아 어떤 순서로 후보를 거르고, 어떤 방식으로 점수를 계산하는지 코드 기준으로 설명한다.

설명 기준 코드는 아래와 같다.

- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendFacade.java`
- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendationScoreCalculator.java`
- `src/main/java/com/example/dahaeng/domain/city/service/CityService.java`
- `src/main/java/com/example/dahaeng/domain/livingcost/util/DailyLivingCostCalculator.java`
- `src/main/java/com/example/dahaeng/domain/recommend/repository/RecommendQueryRepository.java`

## 2. 입력값

추천 API와 추천 상세 조회는 공통적으로 아래 입력을 사용한다.

- `selectedTags`
  - 사용자가 선택한 여행 취향 태그 목록
  - 예: `["food", "nature", "healing"]`
- `userDailyBudget`
  - 사용자가 하루에 쓸 수 있다고 입력한 예산
  - 단위는 KRW
- `travelDays`
  - 여행 일수
- `month`
  - 여행 예정 월

실제 요청 DTO는 아래 형태다.

```json
{
  "selectedTags": ["food", "nature", "healing"],
  "userDailyBudget": 250000,
  "travelDays": 3,
  "month": 4
}
```

## 3. 전체 흐름 요약

추천 목록 API의 흐름은 아래 순서로 동작한다.

1. 요청 태그를 정규화한다.
2. 여행 월 기준으로 항공권 평균가를 조회할 대상 `yearMonth`를 만든다.
3. 도시 후보 전체를 DB에서 조회한다.
4. 각 도시별로 태그 점수, 생활비, 항공권, 안전 정보, 뉴스 패널티를 모은다.
5. 추천에서 제외해야 하는 도시를 먼저 제거한다.
6. 남은 도시에 대해 `태그 점수 + 예산 점수 + 안전 점수 - 뉴스 패널티`를 계산한다.
7. 최종 점수 내림차순으로 정렬한다.
8. 상위 3개 도시만 반환한다.

## 4. 태그 정규화

프론트에서 보내는 API 태그와 DB에 저장된 태그명이 다를 수 있으므로 먼저 정규화한다.

예시:

- `food` -> DB 태그명으로 매핑
- `nature` -> DB 태그명으로 매핑
- `healing` -> DB 태그명으로 매핑
- 이미 DB 태그명으로 들어온 값은 그대로 사용
- 중복은 제거

즉, 사용자가 `["food", "food", "healing"]`을 보내면 실제 계산에는 중복 제거 후 2개 태그만 반영된다.

## 5. 후보 도시 조회

후보 조회 시 가져오는 핵심 데이터는 아래와 같다.

- 도시 정보
  - 도시 ID, 도시명, 국가명, 이미지, 위도/경도, 설명
- 비용 정보
  - 평균 항공권 가격
  - 평균 호텔 가격
  - 점심, 저녁, 커피, 음료, 현지 교통 티켓 가격
- 안전 정보
  - `attention`, `attention_partial`, `control`, `limita`
- 뉴스 정보
  - `news_penalty_score`

중요한 점은 추천 시점에 모든 도시 후보를 먼저 조회한 뒤, 애플리케이션 레이어에서 제외 조건과 점수 계산을 수행한다는 것이다.

## 6. 추천 제외 조건

아래 조건에 해당하면 점수를 계산하더라도 추천 결과에서 제외된다.

### 6.1 국내 도시 제외

국가명이 `South Korea`이면 추천 후보에서 제외한다.

의도:

- 해외 여행 추천 서비스로 동작시키기 위한 필터

### 6.2 위험 단계가 강한 국가 제외

아래 둘 중 하나라도 값이 있으면 추천 후보에서 제외한다.

- `dangerControl`
- `dangerLimita`

즉:

- `attention` 또는 `attention_partial`만 있으면 감점 대상이다.
- `control` 또는 `limita`가 있으면 아예 추천에서 제외된다.

### 6.3 예산을 심하게 초과하는 도시 제외

예상 총비용이 전체 예산의 130%를 초과하면 후보에서 제외한다.

공식:

```text
총예산 = userDailyBudget * travelDays
예상총비용 = 항공권 + (1일 생활비 * travelDays)

if 예상총비용 > 총예산 * 1.3:
    제외
```

해석:

- 조금 비싼 도시는 감점 후 남길 수 있다.
- 너무 비싼 도시는 아예 보여주지 않는다.

## 7. 1일 생활비 계산 방식

생활비는 `DailyLivingCostCalculator` 기준으로 계산한다.

### 7.1 음식비

공식:

```text
아침 = 점심 가격 * 0.5
점심 = 점심 가격
저녁 = 2인 저녁 가격 / 2
커피 = cappuccino
음료 = coke/pepsi

하루 음식비 = 아침 + 점심 + 저녁 + 커피 + 음료
```

### 7.2 교통비

공식:

```text
하루 교통비 = 현지 교통 티켓 가격 * 2
```

가정:

- 하루에 현지 교통 티켓 2회 사용

### 7.3 숙박비

공식:

```text
하루 숙박비 = round(평균 호텔 가격 / 2)
```

즉, 호텔 1실을 2명이 나눠 쓴다고 가정한 1인 기준 값이다.

### 7.4 환율 적용

생활비 원본 데이터는 USD 성격의 값으로 들어오고, 최신 USD 환율이 있으면 KRW로 변환한다.

공식:

```text
KRW 비용 = round(USD 비용 * usdToKrwRate)
```

환율이 없으면 숫자만 반올림해서 사용한다.

## 8. 태그 원점수(tagRaw) 계산 방식

태그 점수는 사용자가 고른 태그와 도시가 가진 태그 간의 일치 정도를 평균으로 계산한다.

### 8.1 일반 태그와 기후 태그 분리

선택 태그는 두 종류로 나뉜다.

- 일반 태그
  - 예: 음식, 자연, 쇼핑, 액티비티
- 기후 태그
  - 예: 더운 날씨, 추운 날씨, 건조함, 온화함

기후 태그는 월별 점수가 필요하므로 `city_climate_tag` 계열 데이터에서 별도로 조회한다.

### 8.2 평균 계산 규칙

규칙은 아래와 같다.

- 일반 태그만 있으면 일반 태그 점수 평균 사용
- 기후 태그만 있으면 기후 태그 점수 평균 사용
- 둘 다 있으면
  - 일반 태그 평균과 기후 태그 평균을 각각 계산한 뒤
  - 두 평균의 산술평균 사용
- 둘 다 없으면 0점

공식:

```text
regularAverage = 매칭된 일반 태그 점수 평균
climateAverage = 매칭된 기후 태그 점수 평균

if 일반만 존재:
    tagRaw = regularAverage
if 기후만 존재:
    tagRaw = climateAverage
if 둘 다 존재:
    tagRaw = (regularAverage + climateAverage) / 2
if 둘 다 없음:
    tagRaw = 0
```

중요:

- 선택한 태그 수가 많다고 무조건 점수가 올라가는 구조가 아니다.
- 평균 기반이라 일부 태그가 낮으면 전체 태그 원점수가 내려간다.

## 9. 최종 점수 구성

최종 추천 점수는 100점 만점 기준으로 계산된다.

구성 요소는 아래 4개다.

- 태그 점수: 최대 55점
- 예산 점수: 최대 +25점, 최소 -25점
- 안전 점수: 15점 또는 7.5점
- 뉴스 패널티: 0점에서 -15점

공식:

```text
finalScore = clamp(tagScore + budgetScore + safetyScore + newsPenaltyScore, 0, 100)
```

여기서 `clamp`는 0 미만이면 0, 100 초과면 100으로 잘라내는 처리다.

## 10. 세부 점수 공식

### 10.1 태그 점수

공식:

```text
tagScore = min(55, max(0, tagRaw) * 55)
```

해석:

- `tagRaw`는 0~1 스케일을 기대한다.
- 1.0이면 55점 만점
- 0.8이면 44점
- 0.5이면 27.5점

예시:

```text
tagRaw = 0.72
tagScore = 0.72 * 55 = 39.6
```

### 10.2 예산 점수

먼저 총예산과 예상총비용을 계산한다.

```text
총예산 = userDailyBudget * travelDays
예상총비용 = avgFlightPrice + (livingCostFor1Day * travelDays)
ratio = (총예산 - 예상총비용) / 총예산
```

그 다음 점수를 아래처럼 계산한다.

```text
ratio >= 0 이면:
    budgetScore = min(25, ratio * 25)

ratio < 0 이면:
    budgetScore = max(-25, (ratio / 0.3) * 25)
```

해석:

- 예산 안에 들어오면 남는 비율만큼 최대 +25점까지 준다.
- 예산을 초과하면 감점한다.
- 30% 초과 수준에서는 -25점 근처까지 빠르게 떨어진다.

예시 1. 예산보다 저렴한 경우

```text
userDailyBudget = 250000
travelDays = 3
총예산 = 750000

avgFlightPrice = 180000
livingCostFor1Day = 120000
예상총비용 = 180000 + (120000 * 3) = 540000

ratio = (750000 - 540000) / 750000 = 0.28
budgetScore = 0.28 * 25 = 7.0
```

예시 2. 예산보다 비싼 경우

```text
총예산 = 750000
예상총비용 = 840000

ratio = (750000 - 840000) / 750000 = -0.12
budgetScore = (-0.12 / 0.3) * 25 = -10.0
```

예시 3. 너무 비싼 경우

```text
총예산 = 750000
예상총비용 = 1000000

1차 필터 확인:
1000000 > 750000 * 1.3 = 975000

결과:
점수 계산 전에 추천 후보에서 제외
```

### 10.3 안전 점수

공식:

```text
dangerAttention 또는 dangerAttentionPartial 중 하나라도 있으면 7.5점
둘 다 없으면 15점
```

해석:

- 약한 주의 단계는 절반 점수만 부여
- 강한 위험 단계는 아예 후보 제외이므로 여기까지 오지 못함

예시:

- 위험 공지 없음 -> `15.0`
- `attention` 있음 -> `7.5`

### 10.4 뉴스 패널티

공식:

```text
newsPenaltyScore = -min(15, max(0, cityNewsPenaltyScore))
```

해석:

- DB에 저장된 `news_penalty_score`를 0~15로 자른 뒤 음수로 반영
- 값이 클수록 최종 점수에서 더 많이 깎임

예시:

- `cityNewsPenaltyScore = 0` -> `0`
- `cityNewsPenaltyScore = 4.2` -> `-4.2`
- `cityNewsPenaltyScore = 18` -> `-15`

## 11. 최종 계산 예시

아래는 실제 계산을 끝까지 따라가는 예시다.

입력:

```text
selectedTags = ["food", "nature", "healing"]
userDailyBudget = 250000
travelDays = 3
month = 4
```

가정된 도시 데이터:

```text
avgFlightPrice = 180000
avgHotelPrice = 160000
점심 = 12 USD
2인 저녁 = 40 USD
카푸치노 = 4 USD
콜라 = 2 USD
교통 티켓 = 1.5 USD
USD 환율 = 1400 KRW

dangerAttention = null
dangerAttentionPartial = null
cityNewsPenaltyScore = 3.5

도시 일반 태그 점수:
- 음식 0.90
- 자연 0.70
- 힐링 0.80
```

### 11.1 생활비 계산

```text
아침 = 12 * 0.5 * 1400 = 8400
점심 = 12 * 1400 = 16800
저녁 = (40 / 2) * 1400 = 28000
커피 = 4 * 1400 = 5600
음료 = 2 * 1400 = 2800

음식비 합계 = 61600

교통 1회 = 1.5 * 1400 = 2100
교통비 합계 = 2100 * 2 = 4200

숙박비 = round(160000 / 2) = 80000

1일 생활비 = 61600 + 4200 + 80000 = 145800
```

### 11.2 예산 적합성 계산

```text
총예산 = 250000 * 3 = 750000
예상총비용 = 180000 + (145800 * 3) = 617400

예상총비용은 750000 * 1.3 = 975000 이하
-> 후보 유지
```

### 11.3 태그 원점수 계산

```text
tagRaw = (0.90 + 0.70 + 0.80) / 3 = 0.80
```

### 11.4 세부 점수 계산

```text
tagScore = 0.80 * 55 = 44.0

ratio = (750000 - 617400) / 750000 = 0.1768
budgetScore = 0.1768 * 25 = 4.42

safetyScore = 15.0

newsPenaltyScore = -3.5
```

### 11.5 최종 점수

```text
finalScore = 44.0 + 4.42 + 15.0 - 3.5 = 59.92
반환 시 반올림 = 59.9
```

즉, 이 도시는 아래처럼 해석할 수 있다.

- 태그 적합도가 높아서 큰 점수를 받음
- 예산에도 들어와서 소폭 가점
- 안전 공지가 없어 만점
- 뉴스 이슈 때문에 3.5점 감점

## 12. 추천 상세 조회에서의 점수 계산

도시 상세 조회에서도 최종 점수 계산식은 추천 목록 API와 동일하다.

차이는 아래와 같다.

- 목록 API
  - 전체 도시를 한 번에 비교해서 상위 3개를 반환
- 상세 API
  - 특정 도시 하나를 대상으로 같은 공식을 적용
  - 왜 이 도시가 이 점수인지 세부 항목까지 내려줌

즉, 상세 API는 목록 API의 점수 계산을 개별 도시 단위로 재현하는 성격이다.

## 13. 응답 반올림 규칙

점수 응답은 대부분 소수점 첫째 자리로 반올림한다.

예:

- `59.92` -> `59.9`
- `4.42` -> `4.4`

단, 관광지의 `spotScore`는 소수점 넷째 자리까지 반올림한다.

## 14. 구현상 주의할 점

### 14.1 태그 점수 스케일 전제

현재 공식은 `tagRaw`가 사실상 0~1 범위라고 가정하고 있다.

만약 DB의 `tag_score`나 `city_climate_tag.score`가 0~1보다 큰 스케일로 저장되면:

- `tagScore`가 매우 쉽게 55점 상한에 걸린다.
- 도시 간 태그 변별력이 약해진다.

### 14.2 예산 점수는 완만한 가점, 빠른 감점 구조

예산을 크게 아껴도 최대 가점은 25점이다.
반대로 예산을 초과하면 감점이 비교적 빠르게 커진다.

즉, 설계 의도는 아래에 가깝다.

- "싸다고 무조건 1등"은 아님
- "너무 비싸면 강하게 불리"함

### 14.3 안전 정보는 3단계로 반영됨

- `control`, `limita`: 후보 제외
- `attention`, `attention_partial`: 절반 점수
- 아무 경고 없음: 만점

즉, 안전 정보는 단순 감점 요소가 아니라 추천 허용 여부까지 좌우한다.

## 15. 한 줄 요약

우리 서비스의 추천 점수는 아래 식으로 이해하면 된다.

```text
추천 점수 = 태그 적합도(최대 55) + 예산 적합도(최대 +25 / 최소 -25) + 안전 점수(7.5 또는 15) - 뉴스 위험도(최대 15)
```

그리고 그 전에 아래 도시들은 미리 걸러진다.

- 한국 도시
- `control` 또는 `limita`가 있는 위험 국가 도시
- 전체 예산의 130%를 초과하는 도시
