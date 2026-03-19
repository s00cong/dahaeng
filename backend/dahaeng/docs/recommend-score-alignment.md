# Recommend Score Alignment

## Goal

`POST /api/recommend` and `GET /api/city/{id}?recommend=true` must produce the same score breakdown when they are evaluated with the same request conditions.

## What Changed

### 1. Shared score calculator

A shared calculator was added at:

- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendationScoreCalculator.java`

Both endpoints now use the same rules for:

- `tagScore`
- `budgetScore`
- `safetyScore`
- `newsPenaltyScore`
- `finalScore`

### Cleanup

Unused legacy recommendation service was removed:

- `src/main/java/com/example/dahaeng/domain/recommend/service/RecommendService.java`

Reason:

- it was not referenced by any controller or service
- it returned `null` and was not part of the active recommendation flow

## 2. Safety score logic unified

Safety score now uses the same danger fields in both endpoints:

- `danger.attention`
- `danger.attentionPartial`

Rule:

- if either value exists, `safetyScore = 7.5`
- otherwise, `safetyScore = 15.0`

## 3. Recommend detail request validation

When calling:

- `GET /api/city/{id}?recommend=true`

the following inputs are now required:

- `userDailyBudget`
- `travelDays`
- `month`

If any of them is missing, the API returns `400 Bad Request`.

Reason:

- without these inputs, detailed scoring cannot match `/api/recommend`

## 4. Selected tags fallback changed

For recommend detail:

- if `selectedTags` is explicitly provided, those tags are used
- if `selectedTags` is omitted, it is treated as an empty selection

It no longer falls back to "all city tags" in recommend detail mode.

This prevents detail scores from inflating when the frontend forgets to resend the original filters.

## Request Rule For Frontend

If the user clicked a city from `/api/recommend`, the frontend should pass the same recommendation context to detail:

```http
GET /api/city/35?recommend=true&selectedTags=초록대자연&userDailyBudget=300000&travelDays=3&month=5
```

The values should come from the original `/api/recommend` request context.

## Expected Result

If the same city is evaluated with the same:

- `selectedTags`
- `userDailyBudget`
- `travelDays`
- `month`

then:

- `/api/recommend`
- `/api/city/{id}?recommend=true`

should return the same score breakdown.
