# 추천 점수 로직 변경 사항

이 문서는 최근 수정된 추천 점수 로직만 정리한다. 구현 기준 파일은 아래와 같다.

- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendationScoreCalculator.java`
- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendFacade.java`
- `src/main/java/com/example/dahaeng/domain/city/service/CityService.java`
- `src/main/java/com/example/dahaeng/domain/recommend/repository/RecommendQueryRepository.java`

## 0. 이번 비중 조정 요약

- 태그 점수 최대치: `55 -> 45`
- 예산 점수 최대치: `18 -> 35`
- 안전 점수 최대치: `15 -> 20`
- 태그 내부 가중치
  - 기존: `tagAverage 0.65 + tagMatchRate 0.35`
  - 변경: `tagAverage 0.55 + tagMatchRate 0.45`
- 예산 점수 방식
  - 기존: 예산이 쌀수록 유리한 단조 구조
  - 변경: 예산에 가장 가까울 때 최고점인 ideal-point 곡선
- 추천 후보 처리
  - 기존: `expectedTotalCost > totalBudget * 1.3` 이면 제외
  - 변경: 자동 제외 없이 예산 점수로만 불리하게 반영

## 1. 입력 예산 의미 변경

기존 `userDailyBudget`는 이름과 다르게 총예산처럼 쓰이고 있었다. 현재는 필드명을 `userTotalBudget`로 바꾸고, 실제 계산도 총예산 기준으로 맞췄다.

- 총예산

```text
totalBudget = userTotalBudget
```

- 총예상비용

```text
expectedTotalCost = avgFlightPrice + (livingCostFor1Day * travelDays)
```

- 후보 제외 없음

```text
예산 차이가 커도 후보를 바로 제거하지 않음
budgetScore에서 비선형으로 불리하게 반영
```

예시:

```text
travelDays = 3
userTotalBudget = 3,000,000
avgFlightPrice = 250,000
livingCostFor1Day = 800,000

expectedTotalCost = 250,000 + (800,000 * 3)
                  = 2,650,000

costBudgetRatio = 2,650,000 / 3,000,000 = 0.8833
-> 예산 이상점(0.95) 근처라 높은 점수
```

예시:

```text
travelDays = 3
userTotalBudget = 3,000,000
avgFlightPrice = 400,000
livingCostFor1Day = 1,250,000

expectedTotalCost = 400,000 + (1,250,000 * 3)
                  = 4,150,000

costBudgetRatio = 4,150,000 / 3,000,000 = 1.3833
-> 후보 제외는 아니지만 예산 점수 0점
```

## 2. 태그 점수 로직 변경

기존에는 매칭된 태그 점수의 단순 평균만 사용했다.

- 문제
  - 한 개 태그만 높아도 점수가 과하게 높아질 수 있었다.
  - 여러 태그를 고르게 만족하는 도시가 충분히 보상되지 않았다.

현재는 아래 두 값을 함께 사용한다.

- `tagAverage`
  - 매칭된 일반 태그와 기후 태그 점수의 전체 평균
- `tagMatchRate`
  - 요청한 태그 중 실제로 매칭된 태그 비율

계산식:

```text
tagAverage = matchedScoreSum / matchedCount
tagMatchRate = matchedCount / selectedTagCount
blendedTagRaw = (tagAverage * 0.55) + (tagMatchRate * 0.45)
tagScore = min(45, blendedTagRaw * 45)
```

### 예시 1. 점수는 높지만 태그를 적게 맞춘 도시

```text
selectedTagCount = 4
matchedCount = 2
matched scores = [0.95, 0.89]

tagAverage = (0.95 + 0.89) / 2 = 0.92
tagMatchRate = 2 / 4 = 0.50

blendedTagRaw = (0.92 * 0.55) + (0.50 * 0.45)
              = 0.506 + 0.225
              = 0.731

tagScore = 0.731 * 45 = 32.9
```

해석:

- 예전 로직이면 `0.92 * 55 = 50.6`
- 지금은 태그 최대치 자체를 낮추고 매칭률 비중을 높여 `32.9`로 내려간다

### 예시 2. 평균은 조금 낮지만 태그를 많이 맞춘 도시

```text
selectedTagCount = 4
matchedCount = 4
matched scores = [0.82, 0.79, 0.77, 0.80]

tagAverage = (0.82 + 0.79 + 0.77 + 0.80) / 4 = 0.795
tagMatchRate = 4 / 4 = 1.00

blendedTagRaw = (0.795 * 0.55) + (1.00 * 0.45)
              = 0.43725 + 0.45
              = 0.88725

tagScore = 0.88725 * 45 = 39.9
```

해석:

- 예전 로직이면 `0.795 * 55 = 43.7`
- 지금은 여러 태그를 고르게 맞춰서 `39.9`까지 올라가지만, 전체 비중은 이전보다 낮다

### 예시 3. 요청 태그가 많을수록 매칭률 영향이 커지는 경우

```text
selectedTagCount = 6
matchedCount = 2
tagAverage = 0.93
tagMatchRate = 2 / 6 = 0.3333

blendedTagRaw = (0.93 * 0.55) + (0.3333 * 0.45)
              = 0.5115 + 0.1500
              = 0.6615

tagScore = 0.6615 * 45 = 29.8
```

해석:

- 태그 평균만 보면 강한 도시지만
- 요청한 태그가 많을수록 "몇 개나 실제로 맞췄는지"가 더 중요해진다

## 3. 안전 점수 세분화

기존에는 아래 둘만 있었다.

- 경고 없음: `15.0`
- `attention` 또는 `attention_partial`: `7.5`

현재는 국가 위험도 필드를 더 세분화해 안전 점수를 준다.

입력으로 반영되는 값:

- `attention`
- `attention_partial`
- `control_partial`
- `limita_partial`
- `evacuate_region_ty`
- `forbidden_region_ty`

점수 규칙:

```text
forbidden_region_ty 또는 control_partial 존재 -> 5.0
evacuate_region_ty 또는 limita_partial 존재 -> 8.0
attention 존재 -> 13.0
attention_partial 존재 -> 16.0
아무 위험 정보 없음 -> 20.0
```

추가로 아래 값은 여전히 추천에서 제외한다.

```text
control 존재 -> 추천 제외
limita 존재 -> 추천 제외
```

### 예시 1. 위험 정보가 없는 국가

```text
attention = null
attention_partial = null
control_partial = null
limita_partial = null
evacuate_region_ty = null
forbidden_region_ty = null

safetyScore = 20.0
```

### 예시 2. 일부 지역 여행유의

```text
attention = null
attention_partial = "여행유의(일부)"

safetyScore = 16.0
```

### 예시 3. 전국 여행유의

```text
attention = "여행유의"
attention_partial = null

safetyScore = 13.0
```

### 예시 4. 일부 지역 철수권고

```text
evacuate_region_ty = "후쿠시마 원전 반경 30km 이내"
forbidden_region_ty = null
control_partial = null
limita_partial = null

safetyScore = 8.0
```

### 예시 5. 일부 지역 여행금지 성격 경고

```text
forbidden_region_ty = "국경 인접 지역"

safetyScore = 5.0
```

### 예시 6. 전면 여행제한

```text
limita = "출국권고"

결과:
추천 후보 제외
```

해석:

- 전면 여행금지/여행제한은 기존처럼 제외
- 일부 지역 위험은 제외 대신 강한 감점
- `attention`보다 `attention_partial`을 약하게 보는 것이 아니라, 일부 지역 경고를 전국 경고보다 조금 덜 심각하게 반영한다

## 4. 예산 점수 ideal-point 모델 적용

현재 예산 점수는 "쌀수록 무조건 좋다"가 아니라, 예산에 적당히 가까운 도시를 가장 선호하는 이상점 모형으로 계산한다.

- 이상점: `expectedTotalCost / totalBudget = 0.95`
- 너무 저렴한 구간 시작: `0.30`
- 너무 비싼 구간 시작: `1.20`
- 최고 점수: `35점`

계산식:

```text
costBudgetRatio = expectedTotalCost / totalBudget

if costBudgetRatio <= 0.30 or costBudgetRatio >= 1.20:
    budgetScore = 0

if costBudgetRatio <= 0.95:
    normalizedDistance = (0.95 - costBudgetRatio) / (0.95 - 0.30)
else:
    normalizedDistance = (costBudgetRatio - 0.95) / (1.20 - 0.95)

budgetScore = (1 - normalizedDistance^2) * 35
```

변경 의도:

- 너무 싼 도시도, 너무 비싼 도시도 덜 선호되게 반영
- 사용자가 생각한 예산에 가까운 도시를 가장 높게 평가
- 30% 초과 여부만으로 기계적으로 제외하지 않고, 곡선 점수로 순위를 조정
- 예산 항목의 최대 영향력을 이전보다 더 크게 가져감

### 예시 1. 예산 여유가 있는 경우

```text
totalBudget = 3,000,000
expectedTotalCost = 2,400,000

costBudgetRatio = 2,400,000 / 3,000,000
                = 0.80

normalizedDistance = (0.95 - 0.80) / 0.65
                   = 0.2308

budgetScore = (1 - 0.2308^2) * 35
            = 33.2
```

해석:

- 예산보다 약간 저렴해서 만족도가 높다
- 너무 싸지도 않고 이상점에도 비교적 가까워 높은 점수를 받는다

### 예시 2. 예산을 10% 초과한 경우

```text
totalBudget = 3,000,000
expectedTotalCost = 3,300,000

costBudgetRatio = 3,300,000 / 3,000,000
                = 1.10

normalizedDistance = (1.10 - 0.95) / 0.25
                   = 0.60

budgetScore = (1 - 0.60^2) * 35
            = 22.4
```

해석:

- 예산을 조금 넘더라도 바로 탈락하지 않는다
- 다만 이상점에서 멀어져 점수가 분명히 낮아진다

### 예시 3. 예산을 20% 초과한 경우

```text
totalBudget = 3,000,000
expectedTotalCost = 3,600,000

costBudgetRatio = 3,600,000 / 3,000,000
                = 1.20

budgetScore = 0
```

### 예시 4. 예산 초과가 매우 큰 경우

```text
totalBudget = 3,000,000
expectedTotalCost = 4,200,000

costBudgetRatio = 4,200,000 / 3,000,000
                = 1.40

budgetScore = 0
```

## 5. 최종 점수식

최종 점수 구조는 유지한다.

```text
finalScore = clamp(tagScore + budgetScore + safetyScore + newsPenaltyScore, 0, 100)
```

현재 각 항목 범위:

- 태그 점수: `0 ~ 45`
- 예산 점수: `0 ~ 35`
- 안전 점수: `5 ~ 20`
- 뉴스 패널티: `-15 ~ 0`

## 6. 종합 예시

### 예시 1. 태그는 고르게 맞고, 예산도 맞고, 위험도도 낮은 경우

입력:

```text
selectedTags = ["초록대자연", "따뜻한곳", "조용한", "가족과"]
travelDays = 3
userTotalBudget = 3,000,000
```

도시 데이터:

```text
avgFlightPrice = 280,000
livingCostFor1Day = 760,000

matched scores = [0.88, 0.81, 0.77, 0.83]
matchedCount = 4
selectedTagCount = 4

attention = null
attention_partial = null
control_partial = null
limita_partial = null
evacuate_region_ty = null
forbidden_region_ty = null

cityNewsPenaltyScore = 4.0
```

계산:

```text
expectedTotalCost = 280,000 + (760,000 * 3)
                  = 2,560,000

costBudgetRatio = 2,560,000 / 3,000,000
                = 0.8533

normalizedDistance = (0.95 - 0.8533) / 0.65
                   = 0.1487
budgetScore = (1 - 0.1487^2) * 35
            = 34.2

tagAverage = (0.88 + 0.81 + 0.77 + 0.83) / 4 = 0.8225
tagMatchRate = 4 / 4 = 1.0
blendedTagRaw = (0.8225 * 0.55) + (1.0 * 0.45)
              = 0.9024
tagScore = 0.9024 * 45 = 40.6

safetyScore = 20.0
newsPenaltyScore = -4.0

finalScore = 40.6 + 34.2 + 20.0 - 4.0
           = 90.8
```

### 예시 2. 태그는 일부만 강하고, 예산도 초과한 경우

입력:

```text
selectedTags = ["초록대자연", "따뜻한곳", "도시의밤", "조용한"]
travelDays = 3
userTotalBudget = 3,000,000
```

도시 데이터:

```text
avgFlightPrice = 420,000
livingCostFor1Day = 1,020,000

matched scores = [0.95, 0.91]
matchedCount = 2
selectedTagCount = 4

attention_partial = "여행유의(일부)"
cityNewsPenaltyScore = 7.0
```

계산:

```text
expectedTotalCost = 420,000 + (1,020,000 * 3)
                  = 3,480,000

costBudgetRatio = 3,480,000 / 3,000,000
                = 1.16

normalizedDistance = (1.16 - 0.95) / 0.25
                   = 0.84
budgetScore = (1 - 0.84^2) * 35
            = 10.3

tagAverage = (0.95 + 0.91) / 2 = 0.93
tagMatchRate = 2 / 4 = 0.50
blendedTagRaw = (0.93 * 0.55) + (0.50 * 0.45)
              = 0.7365
tagScore = 0.7365 * 45 = 33.1

safetyScore = 16.0
newsPenaltyScore = -7.0

finalScore = 33.1 + 10.3 + 16.0 - 7.0
           = 52.4
```

해석:

- 태그 평균은 높아도 매칭률이 낮아서 완전 고득점은 아님
- 예산을 조금 넘지만 후보에서 빠지지 않고, ideal-point 곡선에 따라 중간 수준 점수를 받는다
- 일부 지역 위험 경고와 뉴스 패널티도 추가 감점

### 예시 3. 일부 지역 철수권고가 있는 경우

입력:

```text
selectedTags = ["초록대자연", "따뜻한곳"]
travelDays = 3
userTotalBudget = 3,000,000
```

도시 데이터:

```text
avgFlightPrice = 250,000
livingCostFor1Day = 700,000

matched scores = [0.86, 0.79]
matchedCount = 2
selectedTagCount = 2

evacuate_region_ty = "후쿠시마 원전 반경 30km 이내"
cityNewsPenaltyScore = 5.0
```

계산:

```text
expectedTotalCost = 250,000 + (700,000 * 3)
                  = 2,350,000

costBudgetRatio = 2,350,000 / 3,000,000
                = 0.7833

normalizedDistance = (0.95 - 0.7833) / 0.65
                   = 0.2564
budgetScore = (1 - 0.2564^2) * 35
            = 32.7

tagAverage = (0.86 + 0.79) / 2 = 0.825
tagMatchRate = 2 / 2 = 1.0
blendedTagRaw = (0.825 * 0.55) + (1.0 * 0.45)
              = 0.90375
tagScore = 0.90375 * 45 = 40.7

safetyScore = 8.0
newsPenaltyScore = -5.0

finalScore = 40.7 + 32.7 + 8.0 - 5.0
           = 76.4
```

해석:

- 전면 여행제한은 아니라서 제외되지는 않음
- 대신 안전 점수가 크게 낮아짐

## 7. 변경 후 기대 효과

- 태그 하나만 강한 도시보다, 여러 요청 태그를 고르게 만족하는 도시가 올라온다.
- 일부 지역 위험 경고가 있는 국가는 완전 제외 대신 강하게 감점된다.
- 너무 싸거나 너무 비싼 도시보다, 예산에 근접한 도시가 더 올라온다.
- 30% 초과 여부만으로 끊지 않고도 예산 적합도를 자연스럽게 순위에 반영할 수 있다.
- 추천 결과가 예산, 위험도, 태그 매칭률을 더 직관적으로 반영한다.
