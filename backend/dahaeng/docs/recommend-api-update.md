# 추천 API 점수 필드 문서

## 1. 목적

이 문서는 추천 관련 API에서 내려주는 점수 필드가 무엇을 뜻하는지, 어떤 계산 결과가 어떤 응답 필드로 내려가는지 정리한다.

대상 API:

- `POST /api/recommend`
- `GET /api/city/{id}?recommend=true`

## 2. 추천 목록 API

### 2.1 요청

엔드포인트:

```http
POST /api/recommend
Content-Type: application/json
```

요청 바디:

```json
{
  "selectedTags": ["food", "nature", "healing"],
  "userDailyBudget": 250000,
  "travelDays": 3,
  "month": 4
}
```

### 2.2 응답 핵심 구조

실제 응답 DTO 기준 핵심 구조는 아래와 같다.

```json
{
  "requestContext": {
    "selectedTags": ["food", "nature", "healing"],
    "userDailyBudget": 250000,
    "travelDays": 3,
    "month": 4
  },
  "recommendations": [
    {
      "id": 2,
      "name": "Tokyo",
      "imgUrl": "https://...",
      "livingCostFor1Day": 145800.0,
      "scores": {
        "total": 59.9,
        "tag": 44.0,
        "budget": 4.4,
        "safety": 15.0,
        "newsPenalty": -3.5
      },
      "danger": {
        "countryName": "Japan",
        "danger": []
      },
      "lat": 35.6762,
      "lon": 139.6503
    }
  ]
}
```

### 2.3 점수 필드 정의

#### `scores.total`

- 최종 추천 점수
- 계산식:

```text
tag + budget + safety + newsPenalty
```

- 범위:
  - 0 ~ 100

#### `scores.tag`

- 태그 적합도 점수
- 사용자 취향 태그와 도시 태그/기후 태그의 매칭 평균을 55점 스케일로 환산한 값
- 범위:
  - 0 ~ 55

#### `scores.budget`

- 예산 적합도 점수
- 총예산 대비 예상 총비용의 차이를 반영
- 범위:
  - -25 ~ 25

#### `scores.safety`

- 안전 점수
- 범위:
  - 7.5 또는 15.0

#### `scores.newsPenalty`

- 뉴스 패널티 점수
- 이름은 점수지만 실제 값은 0 또는 음수다
- 범위:
  - -15 ~ 0

## 3. 추천 상세 API

### 3.1 요청

엔드포인트:

```http
GET /api/city/{id}?recommend=true&selectedTags=food&selectedTags=nature&userDailyBudget=250000&travelDays=3&month=4
```

주의:

- `recommend=true`일 때는 아래 파라미터가 모두 필요하다.
  - `userDailyBudget`
  - `travelDays`
  - `month`
- 누락 시 예외가 발생한다.

### 3.2 응답 핵심 구조

```json
{
  "name": "Tokyo",
  "score": {
    "finalScore": 59.9,
    "budgetScore": 4.4,
    "safetyScore": 15.0,
    "tagMatchScore": 44.0,
    "newPenaltyScore": -3.5
  },
  "recommendationReason": "사용자 취향과 잘 맞고...",
  "livingCostFor1Day": {
    "food": {
      "total": 61600.0,
      "breakfast": 8400.0,
      "lunch": 16800.0,
      "dinner": 28000.0,
      "cappuccino": 5600.0,
      "cokePepsi": 2800.0
    },
    "transportation": {
      "total": 4200.0,
      "localTransportTicket": 2100.0,
      "ticketCount": 2.0
    },
    "hotel": 80000.0,
    "total": 145800.0
  },
  "airTicketAndHotel": {
    "airTicket": 180000.0,
    "hotel": 80000.0
  },
  "news": {
    "summation": "...",
    "top3": []
  },
  "danger": {
    "countryName": "Japan",
    "danger": []
  },
  "tags": [],
  "touristSpot": []
}
```

### 3.3 상세 API 점수 필드 정의

#### `score.finalScore`

- 추천 목록 API의 `scores.total`과 같은 값

#### `score.budgetScore`

- 추천 목록 API의 `scores.budget`과 같은 값

#### `score.safetyScore`

- 추천 목록 API의 `scores.safety`와 같은 값

#### `score.tagMatchScore`

- 추천 목록 API의 `scores.tag`와 같은 값

#### `score.newPenaltyScore`

- 추천 목록 API의 `scores.newsPenalty`와 같은 값
- 필드명이 `newPenaltyScore`로 되어 있는데 의미상 `newsPenaltyScore`다

## 4. 목록 API와 상세 API의 관계

두 API는 점수 계산 공식을 공유한다.

차이는 아래다.

- 목록 API
  - 여러 도시를 비교해서 상위 3개를 반환
- 상세 API
  - 특정 도시 1개에 대해 같은 계산식을 적용하고 세부 근거까지 내려줌

즉:

- 목록의 점수는 "비교용"
- 상세의 점수는 "설명용"

하지만 수식 자체는 동일하다.

## 5. 점수 외 보조 필드의 의미

### `livingCostFor1Day`

- 점수 계산에 실제로 사용된 1일 생활비 내역
- 예산 점수 해석의 근거 데이터

### `airTicketAndHotel.airTicket`

- 예상 총비용 계산에 들어가는 항공권 가격

### `danger`

- 안전 점수와 후보 제외 판단의 근거가 되는 국가 위험 정보

### `news`

- 뉴스 패널티와 함께 보여주는 설명 자료
- 패널티 자체는 DB의 `news_penalty_score`를 사용하지만, 상세 응답에서는 관련 뉴스 요약도 함께 내려준다

### `tags`

- 해당 도시가 가진 태그 목록과 태그 점수
- 태그 적합도 설명용 데이터

### `touristSpot`

- 사용자가 고른 태그와 맞는 관광지 추천 결과
- 각 관광지의 `tagScores`와 `spotScore`를 통해 어떤 태그 때문에 추천됐는지 설명 가능

## 6. 관광지 추천 점수 해석

추천 상세의 `touristSpot`은 도시 총점과는 별도 로직으로 만든다.

동작 방식:

1. 선택 태그가 없으면 도시의 관광지 목록을 ID 순으로 최대 5개 반환
2. 선택 태그가 있으면 관광지별 태그 점수를 합산한 `matchScore`로 정렬해 상위 5개 반환
3. 응답에는 각 태그별 점수 맵 `tagScores`를 포함
4. `spotScore`는 `tagScores`의 합계를 소수 넷째 자리로 반올림한 값

예시:

```json
{
  "name": "Senso-ji",
  "tags": ["food", "history"],
  "spotScore": 1.27,
  "tagScores": {
    "food": 0.41,
    "nature": 0.0,
    "history": 0.86
  }
}
```

해석:

- 사용자가 선택한 태그 중 `history`와 강하게 맞고
- `food`와도 일부 맞기 때문에 추천된 관광지

## 7. API 문서화 시 프론트와 맞춰야 할 포인트

### 7.1 `newsPenalty`는 음수값이다

프론트에서 `3.5점`으로 보여주면 의미가 바뀐다.
반드시 감점으로 이해되도록 표시해야 한다.

### 7.2 목록과 상세의 필드명이 다르다

예:

- 목록: `total`
- 상세: `finalScore`

- 목록: `tag`
- 상세: `tagMatchScore`

프론트 모델을 분리하거나 매핑 계층을 두는 것이 안전하다.

### 7.3 `newPenaltyScore`는 오타에 가깝다

상세 API 필드명은 현재 `newPenaltyScore`인데 의미상 `newsPenaltyScore`다.
클라이언트에서는 이름 그대로 받아야 하지만 내부 문서에서는 혼동이 없게 설명해야 한다.

## 8. 추천 응답 해석 예시

예를 들어 아래 응답이 왔다고 가정한다.

```json
"scores": {
  "total": 63.4,
  "tag": 46.2,
  "budget": 6.7,
  "safety": 15.0,
  "newsPenalty": -4.5
}
```

이 응답은 아래처럼 읽으면 된다.

- 취향 적합도가 매우 높다
- 예산에도 무난하게 들어온다
- 안전 공지 이슈는 없다
- 다만 최근 뉴스 리스크로 4.5점 감점됐다
- 최종적으로는 여전히 높은 추천 점수다

## 9. 한 줄 결론

추천 API의 점수 필드는 모두 같은 계산기의 결과이며, 목록 API는 비교용 요약, 상세 API는 근거 설명용 확장 응답으로 보면 된다.
