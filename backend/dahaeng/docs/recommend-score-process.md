# 추천 점수 산정 문서

## 1. 이 문서의 목적

이 문서는 팀원이 아래 내용을 한 번에 이해할 수 있게 정리한 문서다.

- 추천 점수가 어디서 계산되는지
- 최종 점수가 어떤 공식으로 계산되는지
- 예산 점수가 왜 바뀌는지
- 추천 목록 API와 도시 상세 API가 언제 같아야 하는지
- 날씨 태그가 들어오면 어떻게 반영되는지

## 2. 핵심 결론

### 2.1 최종 점수 계산은 지금 한 곳에서 한다

현재 최종 점수 조립은 아래 공용 계산기에서만 한다.

- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendationScoreCalculator.java`

즉:

- `POST /api/recommend`
- `GET /api/city/{id}?recommend=true`

이 두 API는 각각 입력값을 준비한 뒤, 마지막 점수 계산은 같은 계산기를 호출한다.

예전에는 summary/detail에서 점수 계산이 나뉘어 있었지만, 지금은 그 부분을 공통화했다.

### 2.2 날씨 태그는 있을 때만 반영한다

현재 규칙은 다음과 같다.

- 사용자가 climate 태그를 선택하면 `city_climate_tag` 점수를 반영한다
- 사용자가 climate 태그를 선택하지 않으면 기존 일반 태그(`city_tag`)만 사용한다

즉 날씨는 항상 반영되는 게 아니라, 사용자가 실제로 날씨 관련 취향을 선택했을 때만 반영된다.

### 2.3 100점 체계는 유지된다

날씨 태그를 넣어도 100점 체계가 바뀌는 것은 아니다.

변하는 것은:

- `tagRaw`
- 그로 인해 계산되는 `tagScore`

안 변하는 것은:

- `finalScore` 최대 100점
- `tagScore` 최대 55점
- `budgetScore` 최대 25점
- `safetyScore` 최대 15점

## 3. 추천 관련 주요 코드 위치

### 3.1 추천 목록 API

- 컨트롤러: `src/main/java/com/example/dahaeng/domain/recommend/controller/RecommendController.java`
- 서비스: `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendFacade.java`

### 3.2 추천 상세 API

- 서비스: `src/main/java/com/example/dahaeng/domain/city/service/CityService.java`

### 3.3 최종 점수 계산기

- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendationScoreCalculator.java`

### 3.4 날씨 태그 저장소

- 엔티티: `src/main/java/com/example/dahaeng/domain/city/entity/CityClimateTag.java`
- 원천 기후 엔티티: `src/main/java/com/example/dahaeng/domain/city/entity/Climate.java`
- 레포지토리: `src/main/java/com/example/dahaeng/domain/city/repository/CityClimateTagRepository.java`

## 4. 최종 점수 공식

최종 점수는 아래 공식으로 계산된다.

```text
finalScore = clamp(tagScore + budgetScore + safetyScore + newsPenaltyScore, 0, 100)
```

여기서 각 항목 의미는 다음과 같다.

- `tagScore`: 사용자가 원하는 태그와 도시가 얼마나 잘 맞는지
- `budgetScore`: 사용자의 여행 예산에 비해 해당 도시가 얼마나 부담 없는지
- `safetyScore`: 국가 위험도 정보 기준 안전 가점
- `newsPenaltyScore`: 최근 뉴스 리스크 감점

## 5. 각 점수 항목 상세

### 5.1 태그 점수

태그 점수는 먼저 `tagRaw`를 만든 뒤, 그 값을 55점 만점으로 변환한다.

```text
tagScore = min(55.0, tagRaw * 55.0)
```

즉 `tagRaw`가 1.0에 가까우면 최대 55점에 가까워진다.

### 5.2 예산 점수

예산 점수는 사용자의 총 예산과 예상 여행 총비용을 비교해 계산한다.

```text
totalBudget = userDailyBudget * travelDays
expectedTotalCost = avgFlightPrice + (livingCostFor1Day * travelDays)
ratio = (totalBudget - expectedTotalCost) / totalBudget

if ratio >= 0:
    budgetScore = min(25.0, ratio * 25.0)
else:
    budgetScore = max(-25.0, (ratio / 0.3) * 25.0)
```

해석:

- 예산보다 충분히 저렴하면 플러스
- 예산보다 비싸면 마이너스
- 범위는 `-25 ~ +25`

### 5.3 안전 점수

안전 점수는 아래처럼 계산한다.

```text
if danger.attention exists or danger.attentionPartial exists:
    safetyScore = 7.5
else:
    safetyScore = 15.0
```

즉 주의/일부주의 정보가 있으면 안전 점수가 일부 깎인다.

### 5.4 뉴스 감점

```text
newsPenaltyScore = -min(15.0, max(0.0, cityNewsPenaltyScore))
```

즉 최근 뉴스 리스크 점수가 높을수록 감점된다.

## 6. 생활비(`livingCostFor1Day`) 계산 방식

현재 점수 계산에 들어가는 1일 생활비는 다음 합계다.

```text
livingCostFor1Day = food + transportation + hotel(1인 기준)
```

### 6.1 식비 계산식

```text
0.5 * lunch_menu
+ 1.0 * lunch_menu
+ dinner_in_a_restaurant_for_2 / 2
+ cappuccino
+ coke_pepsi
```

즉:

- 아침: 점심 메뉴의 0.5배
- 점심: 점심 메뉴 1회
- 저녁: 2인 저녁 식사 비용의 절반
- 커피 1회
- 콜라/펩시 1회

### 6.2 교통비 계산식

```text
2.0 * local_transport_ticket
```

### 6.3 호텔비 계산식

```text
avgHotelPrice / 2
```

즉 호텔은 2인 1실을 가정하고 1인 기준으로 나눠서 사용한다.

### 6.4 통화

`living_cost_of_city`의 값은 달러 기준이므로, 점수 계산 전에 원화로 변환한다.

## 7. 태그 점수에서 날씨가 반영되는 방식

현재 구현 규칙은 다음과 같다.

1. `selectedTags`를 정규화한다
2. 그 태그를
   - 일반 태그
   - climate 태그
   로 나눈다
3. 일반 태그는 `city_tag`에서 점수를 조회한다
4. climate 태그는 `city_climate_tag`에서 `month` 기준으로 점수를 조회한다
5. 두 결과를 합쳐 `tagRaw`를 만든다

### 7.1 일반 태그만 있는 경우

```text
tagRaw = regularAverage
```

### 7.2 climate 태그만 있는 경우

```text
tagRaw = climateAverage
```

### 7.3 일반 태그 + climate 태그가 모두 있는 경우

```text
tagRaw = (regularAverage + climateAverage) / 2
```

즉 날씨는 최종 점수 공식을 바꾸는 게 아니라, `tagRaw`를 만드는 단계에서만 개입한다.

## 8. climate 태그 목록

현재 코드상 climate 태그 분류는 interest 쪽 카탈로그를 활용한다.

- `src/main/java/com/example/dahaeng/domain/interest/constant/TravelTagCatalog.java`

현재 climate 태그 예시는 다음과 같다.

- `따뜻한곳`
- `추운곳`
- `눈과함께`
- `사계절`
- `건조한`
- `습한`
- `열대`
- `온화한`

## 9. 예시 1: 일반 태그만 선택한 경우

요청:

```json
{
  "selectedTags": ["초록대자연"],
  "userDailyBudget": 300000,
  "travelDays": 3,
  "month": 5
}
```

가정:

- regularAverage = `0.9496`
- flightPrice = `218435`
- livingCostFor1Day = `51834`
- 안전 이슈 없음
- 뉴스 감점 0

### 9.1 태그 점수

```text
tagRaw = 0.9496
tagScore = min(55, 0.9496 * 55)
         = 52.228
         -> 52.2
```

### 9.2 예산 점수

```text
totalBudget = 300000 * 3 = 900000
expectedTotalCost = 218435 + (51834 * 3)
                  = 373937

ratio = (900000 - 373937) / 900000
      = 0.5845...

budgetScore = min(25, ratio * 25)
            = 14.6
```

### 9.3 안전 점수

```text
safetyScore = 15.0
```

### 9.4 뉴스 감점

```text
newsPenaltyScore = 0
```

### 9.5 최종 점수

```text
finalScore = 52.2 + 14.6 + 15.0 + 0
           = 81.8
```

## 10. 예시 2: 일반 태그 + 날씨 태그를 같이 선택한 경우

요청:

```json
{
  "selectedTags": ["초록대자연", "따뜻한곳"],
  "userDailyBudget": 300000,
  "travelDays": 3,
  "month": 5
}
```

가정:

- regularAverage = `0.90`
- climateAverage = `0.98`
- 나머지 budget/safety/news 조건은 동일

### 10.1 태그 점수 계산

```text
tagRaw = (0.90 + 0.98) / 2
       = 0.94

tagScore = 0.94 * 55
         = 51.7
```

### 10.2 의미

- 일반 태그만 썼을 때보다 날씨 태그가 추가 반영됨
- 하지만 여전히 태그 점수 상한은 55점
- 전체 100점 구조는 변하지 않음

## 11. 예시 3: 날씨 태그만 선택한 경우

요청:

```json
{
  "selectedTags": ["따뜻한곳"],
  "userDailyBudget": 300000,
  "travelDays": 3,
  "month": 5
}
```

가정:

- climateAverage = `0.97`
- 일반 태그 없음

### 계산

```text
tagRaw = climateAverage = 0.97
tagScore = 0.97 * 55
         = 53.35
```

즉 일반 태그가 없어도 날씨 태그만으로 태그 점수를 만들 수 있다.

## 12. 예시 4: 날씨 태그를 보냈지만 해당 월 climate 데이터가 없는 경우

요청:

```json
{
  "selectedTags": ["초록대자연", "따뜻한곳"],
  "userDailyBudget": 300000,
  "travelDays": 3,
  "month": 12
}
```

가정:

- regularAverage = `0.91`
- climateAverage = 없음

현재 구현 기준:

- climate 쪽 매칭 결과가 없으면 일반 태그 평균만 사용

즉:

```text
tagRaw = regularAverage = 0.91
tagScore = 0.91 * 55
```

의미:

- 날씨 태그를 보냈더라도 해당 월 데이터가 없으면 날씨는 사실상 점수에 못 들어간다

## 13. 추천 목록 API와 상세 API가 언제 같아야 하는가

### 13.1 같아야 하는 경우

아래 두 요청은 같은 조건이면 점수와 예산이 같아야 한다.

1. `POST /api/recommend`
2. `GET /api/city/{id}?recommend=true`

조건:

- `selectedTags` 동일
- `userDailyBudget` 동일
- `travelDays` 동일
- `month` 동일

예:

```json
POST /api/recommend
{
  "selectedTags": ["초록대자연", "따뜻한곳"],
  "userDailyBudget": 300000,
  "travelDays": 3,
  "month": 5
}
```

```text
GET /api/city/35?recommend=true&selectedTags=초록대자연&selectedTags=따뜻한곳&userDailyBudget=300000&travelDays=3&month=5
```

이 경우:

- `tagScore` 같아야 함
- `budgetScore` 같아야 함
- `safetyScore` 같아야 함
- `newsPenaltyScore` 같아야 함
- `finalScore` 같아야 함
- `livingCostFor1Day.total` 같아야 함

### 13.2 달라도 정상인 경우

아래 비교는 달라도 정상이다.

1. `POST /api/recommend`
2. `GET /api/city/{id}?recommend=false`

이유:

- `recommend=false`는 일반 상세 조회
- 추천 점수 비교를 위한 API가 아님
- 월 기준이나 응답 목적이 다를 수 있음

## 14. 팀원이 설명할 때 써도 되는 한 줄 요약

### 14.1 점수 구조 설명

```text
최종 점수는 태그(최대 55) + 예산(최대 25) + 안전(최대 15) - 뉴스 감점(최대 15)을 합쳐 100점 기준으로 자른 값이다.
```

### 14.2 날씨 태그 설명

```text
날씨 태그는 최종 공식에 새 항목을 추가하는 게 아니라, 태그 점수의 재료인 tagRaw를 더 정교하게 만드는 방식으로만 반영된다.
```

### 14.3 API 일관성 설명

```text
/api/recommend 와 /api/city/{id}?recommend=true 는 같은 조건을 보내면 같은 점수가 나와야 한다.
```

## 15. 현재 구현 상태 요약

- 최종 점수 계산은 공용 계산기 한 곳에서 처리한다
- 날씨 태그는 선택된 경우에만 반영된다
- 날씨 점수는 `CityClimateTag`를 사용한다
- `Climate` 엔티티는 원천 기후 데이터 성격이고, 현재 활성 점수 계산에는 직접 사용하지 않는다
- 일반 추천과 추천 상세는 같은 조건이면 같은 결과가 나오도록 맞춰져 있다
