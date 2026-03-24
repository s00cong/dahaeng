# 추천 점수 로직 변경 사항

이 문서는 최근 수정된 추천 점수 로직만 정리한다. 구현 기준 파일은 아래와 같다.

- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendationScoreCalculator.java`
- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendFacade.java`
- `src/main/java/com/example/dahaeng/domain/city/service/CityService.java`
- `src/main/java/com/example/dahaeng/domain/recommend/repository/RecommendQueryRepository.java`

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

- 1차 예산 필터

```text
if expectedTotalCost > totalBudget * 1.3:
    추천 후보 제외
```

예시:

```text
travelDays = 3
userTotalBudget = 3,000,000
avgFlightPrice = 250,000
livingCostFor1Day = 800,000

expectedTotalCost = 250,000 + (800,000 * 3)
                  = 2,650,000

2,650,000 <= 3,000,000 * 1.3 = 3,900,000
-> 후보 유지
```

예시:

```text
travelDays = 3
userTotalBudget = 3,000,000
avgFlightPrice = 400,000
livingCostFor1Day = 1,250,000

expectedTotalCost = 400,000 + (1,250,000 * 3)
                  = 4,150,000

4,150,000 > 3,900,000
-> 후보 제외
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
blendedTagRaw = (tagAverage * 0.65) + (tagMatchRate * 0.35)
tagScore = min(55, blendedTagRaw * 55)
```

### 예시 1. 점수는 높지만 태그를 적게 맞춘 도시

```text
selectedTagCount = 4
matchedCount = 2
matched scores = [0.95, 0.89]

tagAverage = (0.95 + 0.89) / 2 = 0.92
tagMatchRate = 2 / 4 = 0.50

blendedTagRaw = (0.92 * 0.65) + (0.50 * 0.35)
              = 0.598 + 0.175
              = 0.773

tagScore = 0.773 * 55 = 42.5
```

해석:

- 예전 로직이면 `0.92 * 55 = 50.6`
- 지금은 매칭률이 낮아서 `42.5`로 내려간다

### 예시 2. 평균은 조금 낮지만 태그를 많이 맞춘 도시

```text
selectedTagCount = 4
matchedCount = 4
matched scores = [0.82, 0.79, 0.77, 0.80]

tagAverage = (0.82 + 0.79 + 0.77 + 0.80) / 4 = 0.795
tagMatchRate = 4 / 4 = 1.00

blendedTagRaw = (0.795 * 0.65) + (1.00 * 0.35)
              = 0.51675 + 0.35
              = 0.86675

tagScore = 0.86675 * 55 = 47.7
```

해석:

- 예전 로직이면 `0.795 * 55 = 43.7`
- 지금은 여러 태그를 고르게 맞춰서 `47.7`까지 올라간다

### 예시 3. 요청 태그가 많을수록 매칭률 영향이 커지는 경우

```text
selectedTagCount = 6
matchedCount = 2
tagAverage = 0.93
tagMatchRate = 2 / 6 = 0.3333

blendedTagRaw = (0.93 * 0.65) + (0.3333 * 0.35)
              = 0.6045 + 0.1167
              = 0.7212

tagScore = 0.7212 * 55 = 39.7
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
forbidden_region_ty 또는 control_partial 존재 -> 4.0
evacuate_region_ty 또는 limita_partial 존재 -> 6.0
attention 존재 -> 10.0
attention_partial 존재 -> 12.0
아무 위험 정보 없음 -> 15.0
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

safetyScore = 15.0
```

### 예시 2. 일부 지역 여행유의

```text
attention = null
attention_partial = "여행유의(일부)"

safetyScore = 12.0
```

### 예시 3. 전국 여행유의

```text
attention = "여행유의"
attention_partial = null

safetyScore = 10.0
```

### 예시 4. 일부 지역 철수권고

```text
evacuate_region_ty = "후쿠시마 원전 반경 30km 이내"
forbidden_region_ty = null
control_partial = null
limita_partial = null

safetyScore = 6.0
```

### 예시 5. 일부 지역 여행금지 성격 경고

```text
forbidden_region_ty = "국경 인접 지역"

safetyScore = 4.0
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

## 4. 예산 점수 패널티 강화

기존 예산 점수:

```text
ratio = (totalBudget - expectedTotalCost) / totalBudget

ratio >= 0 -> min(25, ratio * 25)
ratio < 0 -> max(-25, (ratio / 0.3) * 25)
```

현재 예산 점수:

```text
ratio = (totalBudget - expectedTotalCost) / totalBudget

ratio >= 0 -> min(18, ratio * 18)
ratio < 0 -> max(-30, (ratio / 0.3) * 30)
```

변경 의도:

- 예산이 남는다고 과하게 보상하지 않음
- 예산 초과는 이전보다 더 강하게 패널티
- 비싼 도시가 태그 점수만으로 상위권에 남는 현상을 완화

### 예시 1. 예산 여유가 있는 경우

```text
totalBudget = 3,000,000
expectedTotalCost = 2,400,000

ratio = (3,000,000 - 2,400,000) / 3,000,000
      = 0.20

budgetScore = 0.20 * 18 = 3.6
```

해석:

- 기존 로직이면 `0.20 * 25 = 5.0`
- 현재는 예산 여유를 덜 공격적으로 보상

### 예시 2. 예산을 10% 초과한 경우

```text
totalBudget = 3,000,000
expectedTotalCost = 3,300,000

ratio = (3,000,000 - 3,300,000) / 3,000,000
      = -0.10

budgetScore = (-0.10 / 0.3) * 30 = -10.0
```

해석:

- 기존 로직이면 `-8.3`
- 현재는 더 세게 깎는다

### 예시 3. 예산을 20% 초과한 경우

```text
totalBudget = 3,000,000
expectedTotalCost = 3,600,000

ratio = (3,000,000 - 3,600,000) / 3,000,000
      = -0.20

budgetScore = (-0.20 / 0.3) * 30
            = -20.0
```

### 예시 4. 예산 초과가 매우 큰 경우

```text
totalBudget = 3,000,000
expectedTotalCost = 4,200,000

1차 필터 확인:
4,200,000 > 3,000,000 * 1.3 = 3,900,000

결과:
추천 후보 제외
```

## 5. 최종 점수식

최종 점수 구조는 유지한다.

```text
finalScore = clamp(tagScore + budgetScore + safetyScore + newsPenaltyScore, 0, 100)
```

현재 각 항목 범위:

- 태그 점수: `0 ~ 55`
- 예산 점수: `-30 ~ 18`
- 안전 점수: `4 ~ 15`
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

ratio = (3,000,000 - 2,560,000) / 3,000,000
      = 0.1467
budgetScore = 0.1467 * 18 = 2.6

tagAverage = (0.88 + 0.81 + 0.77 + 0.83) / 4 = 0.8225
tagMatchRate = 4 / 4 = 1.0
blendedTagRaw = (0.8225 * 0.65) + (1.0 * 0.35)
              = 0.8846
tagScore = 0.8846 * 55 = 48.7

safetyScore = 15.0
newsPenaltyScore = -4.0

finalScore = 48.7 + 2.6 + 15.0 - 4.0
           = 62.3
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

ratio = (3,000,000 - 3,480,000) / 3,000,000
      = -0.16
budgetScore = (-0.16 / 0.3) * 30 = -16.0

tagAverage = (0.95 + 0.91) / 2 = 0.93
tagMatchRate = 2 / 4 = 0.50
blendedTagRaw = (0.93 * 0.65) + (0.50 * 0.35)
              = 0.7795
tagScore = 0.7795 * 55 = 42.9

safetyScore = 12.0
newsPenaltyScore = -7.0

finalScore = 42.9 - 16.0 + 12.0 - 7.0
           = 31.9
```

해석:

- 태그 평균은 높아도 매칭률이 낮아서 완전 고득점은 아님
- 예산 초과가 커서 순위가 크게 내려감
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

ratio = (3,000,000 - 2,350,000) / 3,000,000
      = 0.2167
budgetScore = 0.2167 * 18 = 3.9

tagAverage = (0.86 + 0.79) / 2 = 0.825
tagMatchRate = 2 / 2 = 1.0
blendedTagRaw = (0.825 * 0.65) + (1.0 * 0.35)
              = 0.88625
tagScore = 0.88625 * 55 = 48.7

safetyScore = 6.0
newsPenaltyScore = -5.0

finalScore = 48.7 + 3.9 + 6.0 - 5.0
           = 53.6
```

해석:

- 전면 여행제한은 아니라서 제외되지는 않음
- 대신 안전 점수가 크게 낮아짐

## 7. 변경 후 기대 효과

- 태그 하나만 강한 도시보다, 여러 요청 태그를 고르게 만족하는 도시가 올라온다.
- 일부 지역 위험 경고가 있는 국가는 완전 제외 대신 강하게 감점된다.
- 고비용 도시가 총예산 대비 더 불리하게 반영된다.
- 추천 결과가 예산, 위험도, 태그 매칭률을 더 직관적으로 반영한다.
