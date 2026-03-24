# allCity API 및 추천 상세 성능 정리

## 1. 대상 API

- `GET /api/city`
- `GET /api/city/{cityId}?recommend=true...`

이 문서는 처음에는 `GET /api/city` 성능 개선 내용을 정리하기 위해 만들었고, 이후 추천 상세 조회와 뉴스/LLM 병목 분석 내용도 이어서 정리했다.

## 2. `GET /api/city`가 느렸던 원인

기존 `CityService.getAllCities()`는 도시 목록을 가져온 뒤, 도시마다 추가 데이터를 개별 조회하는 구조였다.

도시별로 반복 조회하던 항목:

- 항공권 요약
- 생활비
- 위험도 정보
- 국가 정보

즉 도시 수가 늘수록 쿼리 수도 같이 늘어나는 전형적인 N+1 구조였다.

예를 들어 도시가 80개라면 대략 아래와 같은 패턴이 발생할 수 있었다.

- 도시 목록 조회 1번
- 항공권 조회 80번
- 생활비 조회 80번
- 위험도/국가 조회 다수

이 구조 때문에 `GET /api/city` 응답 시간이 도시 수에 비례해서 느려졌다.

## 3. `GET /api/city` 개선 방향

핵심은 도시별 반복 조회를 없애고, 배치 조회 후 `Map`으로 조립하는 방식으로 바꾸는 것이다.

적용 방향:

1. 도시 목록을 `country`까지 한 번에 조회
2. 항공권 요약을 도시 ID 목록 기준으로 한 번에 조회
3. 생활비를 도시 목록 기준으로 한 번에 조회
4. danger 정보를 국가 ID 목록 기준으로 한 번에 조회
5. 애플리케이션 레이어에서 `Map<id, value>`로 조립

## 4. 실제 반영 내용

### 4.1 도시 조회

관련 파일:

- `src/main/java/com/example/dahaeng/domain/city/repository/CityRepository.java`

추가/사용 메서드:

- `findAllWithCountryByIsDeletedFalse()`

효과:

- `City -> Country`를 fetch join으로 함께 가져와서 국가 접근 시 추가 조회를 줄였다.

### 4.2 항공권 배치 조회

관련 파일:

- `src/main/java/com/example/dahaeng/domain/flight/repository/FlightSummaryRepository.java`

사용 메서드:

- `findAllByYearMonthAndCityIdsWithCity(...)`

효과:

- 도시별 `findByCityIdAndYearMonthWithCity(...)` 반복 호출을 제거했다.

### 4.3 danger 배치 조회

관련 파일:

- `src/main/java/com/example/dahaeng/domain/country/repository/DangerRepository.java`
- `src/main/java/com/example/dahaeng/domain/country/repository/CountryRepository.java`
- `src/main/java/com/example/dahaeng/domain/country/service/DangerService.java`

사용 메서드:

- `DangerRepository.findAllByCountryIds(...)`
- `CountryRepository.findAllByIdInAndIsDeletedFalse(...)`
- `DangerService.dangersByCountryIds(...)`

효과:

- 도시마다 `dangerService.dangers(countryId)`를 호출하던 구조를 없애고, 국가 ID 목록 기준으로 한 번에 조회해서 `Map<countryId, CountryDangerResponse>`로 재사용하게 했다.

### 4.4 서비스 조립 방식 변경

관련 파일:

- `src/main/java/com/example/dahaeng/domain/city/service/CityService.java`

변경 내용:

- `cityRepository.findAll()` 제거
- `cityRepository.findAllWithCountryByIsDeletedFalse()` 사용
- 항공권, 생활비, danger를 각각 배치 조회
- 조회 결과를 `Map`으로 조립해서 응답 생성

## 5. `GET /api/city` 개선 후 기대 효과

개선 전:

- 도시 수 증가에 따라 SQL 수가 같이 증가

개선 후:

- 도시 수가 늘어나도 쿼리 수는 거의 고정 수준 유지

대략적인 호출 구조:

- 도시+국가 조회 1번
- 항공권 조회 1번
- 생활비 조회 1번
- danger 조회 1번

즉 N+1에서 배치 조회 구조로 바뀌었다.

## 6. 검증 방법

확인 방법:

1. Hibernate SQL 로그 활성화
2. `GET /api/city` 1회 호출
3. 호출 전후 SQL 개수와 응답 시간 비교

보면 좋은 지표:

- API 응답 시간
- 실행된 SQL 수
- 도시 수가 증가할 때 추가 쿼리가 선형으로 증가하는지 여부

## 7. 오늘 추가로 작업한 내용

오늘은 `GET /api/city` 성능 개선 외에도 추천 상세, 북마크, 뉴스 처리와 관련된 구조를 추가로 수정했다.

### 7.1 추천 결과 단위 `recommendId` 추가

목적:

- 추천 1회 결과를 하나의 단위로 식별하기 위해
- 추천 상세와 북마크 요청에 같은 추천 결과 맥락을 넘기기 위해

반영 내용:

- `POST /api/recommend` 응답 최상단에 `recommendId` 추가
- `GET /api/city/{id}?recommend=true...&recommendId=...` 형태로 추천 상세 요청 가능하도록 변경

관련 파일:

- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendFacade.java`
- `src/main/java/com/example/dahaeng/domain/recommend/dto/response/RecommendCitySummaryResponse.java`
- `src/main/java/com/example/dahaeng/domain/city/controller/CityController.java`
- `src/main/java/com/example/dahaeng/domain/city/service/CityService.java`

현재 `recommendId`는 서명 없는 `UUID.randomUUID()` 기반이다.

### 7.2 북마크 중복 기준 변경

기존:

- 같은 회원이 같은 도시를 같은 날 북마크하면 막는 구조

변경 후:

- 같은 회원이 같은 `cityId`와 같은 `recommendId` 조합으로 다시 북마크할 때만 막음
- 같은 도시라도 다른 추천 결과(`recommendId`)면 다시 북마크 가능

의도:

- "도시 단위 북마크"가 아니라 "추천 결과 단위 북마크" 요구를 맞추기 위해

관련 파일:

- `src/main/java/com/example/dahaeng/domain/bookmark/repository/BookmarkRepository.java`
- `src/main/java/com/example/dahaeng/domain/bookmark/service/BookmarkService.java`

### 7.3 추천 상세 성능 로그 추가

추천 상세가 느린 원인을 구간별로 확인하기 위해 타이밍 로그를 추가했다.

`CityService.getRecommendCityDetail(...)`에서 측정하는 구간:

- `basicDataMs`
- `placesMs`
- `newsMs`
- `narrationMs`
- `totalMs`

관련 파일:

- `src/main/java/com/example/dahaeng/domain/city/service/CityService.java`

예시 로그:

```text
recommendCityDetail cityId=1 recommendId=... basicDataMs=145 placesMs=1774 newsMs=4855 narrationMs=2674 totalMs=9482
```

### 7.4 뉴스 API 디버깅 로그 추가

뉴스가 왜 안 뜨는지 구분하기 위해 NewsAPI 응답 상태 자체를 로그로 남기도록 했다.

추가 로그:

- `newsSearch api ... newsApiMs=...`
- `newsSearch response ... status=... totalResults=... code=... message=...`
- `newsSearch articles ... fetchedCount=...`

관련 파일:

- `src/main/java/com/example/dahaeng/domain/recommend/service/NewsApiSearchService.java`

이 로그로 아래를 구분할 수 있게 됐다.

- NewsAPI 호출 실패
- 응답은 성공했지만 검색 결과 0건
- DTO 파싱 문제
- rate limit / 인증 문제

### 7.5 뉴스 제목 한글 번역 추가

현재 구조는 다음처럼 동작하도록 정리했다.

- 뉴스는 최대 5개 수집
- 뉴스 요약은 최대 5개 기준으로 생성
- 실제 사용자에게 보여주는 상위 3개 제목만 한글 번역

즉 "5개 수집 및 요약 / 3개 제목만 번역 및 노출" 구조다.

관련 파일:

- `src/main/java/com/example/dahaeng/domain/recommend/service/NewsApiSearchService.java`

## 8. 추천 상세 성능 분석 결과

실제 로그 기준으로 추천 상세 병목은 DB보다 외부 호출과 LLM 쪽에 더 가깝게 확인되었다.

예시:

```text
recommendCityDetail cityId=1 recommendId=... basicDataMs=145 placesMs=1774 newsMs=4855 narrationMs=2674 totalMs=9482
```

해석:

- 기본 데이터 조회: 약 0.1초
- 관광지 추천: 약 1.8초
- 뉴스 단계: 약 4.9초
- 추천 이유 생성: 약 2.7초
- 전체: 약 9.5초

즉 가장 큰 병목은 아래 순서였다.

1. 뉴스 단계
2. 추천 이유 생성 LLM
3. 관광지 추천

또한 뉴스 단계 내부 로그를 보면:

- 어떤 도시는 `status=ok, totalResults=0`으로 0건
- 어떤 도시는 `status=ok, totalResults>0`로 정상 수집

즉 "뉴스 API가 아예 안 된다"가 아니라, 도시별로 현재 검색식이 너무 좁아서 0건이 나오는 경우도 확인되었다.

## 9. 현재까지 확인된 병목과 개선 방향

### 9.1 뉴스 단계

느린 이유:

- 외부 NewsAPI 호출
- 기사 요약 LLM
- 상위 3개 제목 번역 LLM

개선 방향:

- 검색 fallback 쿼리 추가
- 기간 7일 -> 14일/30일 확대 검토
- 제목 번역을 선택 기능으로 분리하거나 캐시

### 9.2 추천 이유 생성

느린 이유:

- `recommendationReason` 생성에 LLM 호출 사용

개선 방향:

- 규칙 기반 템플릿으로 대체
- 또는 캐시 적용
- 또는 더 빠른 모델 사용

현재 로그 기준으로는 추천 이유 LLM이 가장 먼저 제거/최적화 대상이다.

### 9.3 관광지 추천

`placesMs`도 일부 도시에서는 1초 이상 나오므로, 관광지 후보 쿼리 및 후처리도 추가 분석 대상이다.

다만 현재 전체 응답 시간에서 가장 큰 비중은 여전히 뉴스와 narration 단계다.

## 10. 정리

오늘 기준으로 성능 관련 핵심 정리는 아래와 같다.

- `GET /api/city`는 N+1 구조를 배치 조회 방식으로 개선했다.
- 추천 상세는 구간별 성능 로그를 넣어 병목을 확인할 수 있게 했다.
- 뉴스는 "호출 실패"와 "검색 결과 0건"을 구분할 수 있도록 응답 상태 로그를 추가했다.
- 추천 상세의 가장 큰 병목은 현재 `news` 단계와 `recommendationReason` 생성 LLM이다.
- 북마크는 이제 추천 결과 단위(`recommendId`)로 구분할 수 있는 구조를 반영했다.
