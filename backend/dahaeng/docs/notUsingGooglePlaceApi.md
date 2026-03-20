# 추천 관광지 상세 응답에서 Google Places API 미사용 처리

## 1. 변경 목적

추천 도시 상세 조회(`GET /api/city/{id}?recommend=true`)의 `touristSpot` 응답에서
Google Places API로 가져오던 관광지 `description`, `imageUrl`을 더 이상 사용하지 않는다.

대신 우리 DB(`tourist_spot`)에 저장된 아래 필드를 내려준다.

- `address`
- `websiteUrl`
- `socialUrl`

즉, 추천 관광지 상세 응답은 이제 외부 Google Places 결과에 의존하지 않고
DB 기반 정보만 사용한다.

## 2. 변경 배경

기존 구현은 추천 관광지 후보를 만든 뒤 `PlaceEnrichmentService`를 통해
Google Places API를 호출해서 관광지 설명과 이미지를 보강하고 있었다.

이 방식의 문제는 다음과 같았다.

- 외부 API 호출에 의존한다.
- 장소 이름만으로 검색해 동명이소를 잘못 잡을 수 있다.
- 우리 DB에 이미 있는 `address`, `website`, `sns` 정보가 응답에 포함되지 않았다.

## 3. 코드 변경 사항

### 3.1 Google Places API 호출 제거

다음 서비스는 더 이상 Google Places API를 호출하지 않는다.

- `src/main/java/com/example/dahaeng/domain/recommend/service/GooglePlacesEnrichmentService.java`

현재는 이름은 유지하지만, 실제 동작은 DB projection에 담긴 값만 그대로 응답 DTO로 옮기는 역할만 수행한다.

### 3.2 추천 관광지 projection 확장

다음 projection/repository에 DB 필드를 추가했다.

- `src/main/java/com/example/dahaeng/domain/recommend/repository/SpotRecommendationProjection.java`
- `src/main/java/com/example/dahaeng/domain/recommend/repository/TouristSpotRecommendRepository.java`

추가 필드:

- `address`
- `websiteUrl`
- `socialUrl`

### 3.3 추천 상세 응답 DTO 변경

다음 DTO에서 `touristSpot` 항목을 수정했다.

- `src/main/java/com/example/dahaeng/domain/city/dto/response/RecommendCityDetailResponse.java`

변경 내용:

- 제거: `description`
- 제거: `imageUrl`
- 추가: `address`
- 추가: `websiteUrl`
- 추가: `socialUrl`

### 3.4 추천용 공통 DTO 변경

다음 DTO도 동일한 방향으로 정리했다.

- `src/main/java/com/example/dahaeng/domain/recommend/dto/response/RecommendCitiesResponse.java`

`RecommendedPlace`에서도 Google Places 기반 `description`, `imageUrl`을 제거하고
DB 기반 `address`, `websiteUrl`, `socialUrl`을 추가했다.

## 4. 현재 응답 구조

### 4.1 추천 도시 상세 조회 예시

요청 예시:

```http
GET /api/city/35?recommend=true&selectedTags=초록대자연&selectedTags=따뜻한곳&userDailyBudget=300000&travelDays=3&month=5
```

응답 예시:

```json
{
  "name": "Chiang Mai",
  "score": {
    "finalScore": 72.3,
    "budgetScore": 15.1,
    "safetyScore": 7.5,
    "tagMatchScore": 49.7,
    "newPenaltyScore": 0.0
  },
  "recommendationReason": "치앙마이는 초록대자연을 즐길 수 있는 따뜻한 곳으로, 다양한 자연 경관과 축제가 매력적입니다.",
  "livingCostFor1Day": {
    "food": {
      "total": 24621.0,
      "breakfast": 1664.0,
      "lunch": 3328.0,
      "dinner": 15468.0,
      "cappuccino": 2957.0,
      "cokePepsi": 1204.0
    },
    "transportation": {
      "total": 2912.0,
      "localTransportTicket": 1456.0,
      "ticketCount": 2.0
    },
    "hotel": 24177.0,
    "total": 51710.0
  },
  "airTicketAndHotel": {
    "airTicket": 202792.0,
    "hotel": 24177.0
  },
  "exchangeRate": {
    "currency": "THB",
    "krwPerDisplayUnit": 46.008741660915575,
    "eventDate": "2026-03-18"
  },
  "news": {
    "summation": "치앙마이행 항공권이 할인 중입니다.",
    "top3": []
  },
  "danger": {
    "countryName": "Thailand",
    "items": [
      {
        "level": "여행유의(일부)",
        "description": "2·3단계 및 특별여행주의보 발령 지역을 제외한 지역"
      }
    ]
  },
  "tags": [
    {
      "name": "초록대자연",
      "tagScore": 0.9496
    }
  ],
  "touristSpot": [
    {
      "name": "Doi Suthep-Pui National Park",
      "lat": 18.8070052,
      "lon": 98.9160906,
      "address": "치앙마이 ...",
      "websiteUrl": "https://example.com",
      "socialUrl": "https://instagram.com/example",
      "tags": [
        "초록대자연"
      ],
      "spotScore": 0.9501,
      "tagScores": {
        "초록대자연": 0.9500626074,
        "따뜻한곳": 0.0
      }
    }
  ]
}
```

## 5. 응답 해석

이제 `touristSpot`에서 아래 필드는 내려오지 않는다.

- `description`
- `imageUrl`

대신 아래 필드가 내려온다.

- `address`
- `websiteUrl`
- `socialUrl`

## 6. 참고

일반 관광지 상세 API(`GET /api/places/{id}`)는 원래부터 `tourist_spot` 엔티티 기준으로
`description`, `address`, `socialUrl`, `websiteUrl` 등을 내려주고 있었다.

이번 변경은 추천 상세 응답도 외부 API 기반 보강 대신
DB 기준 응답으로 맞춘 작업이라고 보면 된다.
