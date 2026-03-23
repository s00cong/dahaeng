# allCity API 성능 개선 문서

## 1. 대상 API

- `GET /api/city`

이 API는 전체 도시 목록을 내려주며, 각 도시마다 아래 정보를 함께 반환한다.

- 도시 기본 정보
- 1일 생활비
- 위험도 정보
- 위도/경도

## 2. 기존 병목 원인

기존 `CityService.getAllCities()`는 도시 목록을 가져온 뒤, 도시별로 추가 조회를 반복하는 구조였다.

기존 흐름:

1. 도시 전체 조회
2. 각 도시마다 항공권 요약 1회 조회
3. 각 도시마다 생활비 1회 조회
4. 각 도시마다 위험도 서비스 호출
5. 위험도 서비스 내부에서 국가 조회 1회
6. 위험도 서비스 내부에서 danger 조회 1회

즉, 도시 수가 N개일 때 대략 아래 형태의 N+1 쿼리가 발생했다.

- 도시 조회 1회
- 항공권 조회 N회
- 생활비 조회 N회
- 국가 조회 N회
- danger 조회 N회

도시가 많아질수록 응답 시간이 빠르게 늘어나는 구조였다.

## 3. 개선 방향

핵심은 "도시별 반복 조회"를 "한 번에 배치 조회"로 바꾸는 것이다.

변경 후 흐름:

1. 도시 전체를 `country`와 함께 한 번에 조회
2. 해당 도시들의 항공권 요약을 한 번에 조회
3. 해당 도시들의 생활비를 한 번에 조회
4. 해당 국가들의 위험도 정보를 한 번에 조회
5. 메모리에서 `Map`으로 조합해 응답 생성

## 4. 코드 변경 사항

### 4.1 도시 조회

파일:

- `src/main/java/com/example/dahaeng/domain/city/repository/CityRepository.java`

추가 메서드:

- `findAllWithCountryByIsDeletedFalse()`

의도:

- `City -> Country` 지연 로딩을 줄이고
- 삭제되지 않은 도시만 대상으로 바로 조회하기 위함

### 4.2 항공권 배치 조회

파일:

- `src/main/java/com/example/dahaeng/domain/flight/repository/FlightSummaryRepository.java`

추가 메서드:

- `findAllByYearMonthAndCityIdsWithCity(...)`

의도:

- 기존 도시별 `findByCityIdAndYearMonthWithCity(...)` 반복 호출 제거

### 4.3 위험도 배치 조회

파일:

- `src/main/java/com/example/dahaeng/domain/country/repository/DangerRepository.java`
- `src/main/java/com/example/dahaeng/domain/country/repository/CountryRepository.java`
- `src/main/java/com/example/dahaeng/domain/country/service/DangerService.java`

추가 메서드:

- `DangerRepository.findAllByCountryIds(...)`
- `CountryRepository.findAllByIdInAndIsDeletedFalse(...)`
- `DangerService.dangersByCountryIds(...)`

의도:

- 도시마다 `dangerService.dangers(countryId)`를 호출하던 구조를
- 국가 ID 목록 전체를 한 번에 받아 `Map<countryId, CountryDangerResponse>`를 만드는 방식으로 변경

### 4.4 서비스 로직 변경

파일:

- `src/main/java/com/example/dahaeng/domain/city/service/CityService.java`

변경 내용:

- `cityRepository.findAll()` 제거
- `cityRepository.findAllWithCountryByIsDeletedFalse()` 사용
- 항공권/생활비/위험도를 각각 배치 조회 후 `Map`으로 변환
- 도시별 응답 생성 시 `Map`에서 꺼내 사용

## 5. 기대 효과

기존:

- 도시 수가 늘어날수록 쿼리 수가 선형적으로 증가

변경 후:

- 도시 수가 늘어나도 핵심 조회는 소수의 배치 쿼리로 고정

대략적인 쿼리 구조:

- 도시 + country 조회 1회
- 항공권 조회 1회
- 생활비 조회 1회
- 국가 조회 1회
- danger 조회 1회
- 환율 조회 1회

즉, 이전의 N+1 구조에서 "거의 상수 개수의 조회" 구조로 바뀐다.

## 6. 테스트 포인트

### 6.1 기능 테스트

- `GET /api/city` 호출 시 기존과 동일하게 도시 목록이 내려오는지 확인
- `livingCostFor1Day`에 해당하는 값이 기존과 동일한지 확인
- `danger` 정보가 기존과 동일한지 확인
- 서울은 여전히 제외되는지 확인

### 6.2 성능 테스트

변경 전후로 아래를 비교하면 된다.

- API 응답 시간
- SQL 로그 출력 횟수

확인 방법 예시:

1. Hibernate SQL 로그 활성화
2. `GET /api/city` 1회 호출
3. 변경 전/후 총 SQL 실행 횟수 비교

정상이라면 변경 후 SQL 로그 수가 크게 줄어야 한다.

## 7. 추가 개선 여지

이번 작업은 N+1 제거가 핵심이다.

추가로 더 줄이려면 다음도 고려할 수 있다.

- `/api/city` 응답 캐시 적용
- 항공권/생활비 집계 전용 projection 쿼리 사용
- `DailyLivingCostCalculator` 계산 결과 캐시

하지만 현재 체감 성능 문제의 1차 원인은 반복 쿼리였고, 이번 변경은 그 부분을 직접 해결하는 작업이다.
