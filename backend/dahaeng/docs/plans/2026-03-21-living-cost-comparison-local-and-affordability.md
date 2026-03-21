# Living Cost Comparison Local And Affordability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add absolute local daily cost comparison and income-adjusted affordability comparison to the living cost comparison response.

**Architecture:** Keep `LivingCostComparisonResponse` as the top-level DTO, add dedicated response records for the two new comparison blocks, and compute all intermediate totals in USD before converting display amounts to KRW at DTO assembly time. Preserve the existing comparison payload while keeping the new calculations isolated in small helper methods.

**Tech Stack:** Java, Spring Boot, JUnit 5, AssertJ

---

### Task 1: Lock the desired response behavior with tests

**Files:**
- Modify: `src/test/java/com/example/dahaeng/domain/livingcost/dto/response/compare/LivingCostComparisonResponseTest.java`

**Step 1: Write the failing test**

Add assertions for:
- `localCostCompare` KRW totals and percent gap
- `affordabilityCompare` KRW daily income and burden rates
- salary-missing case returning `null` affordability block

**Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "com.example.dahaeng.domain.livingcost.dto.response.compare.LivingCostComparisonResponseTest"`

Expected: FAIL because new response fields and behavior do not exist yet.

**Step 3: Write minimal implementation**

Add new response records and extend `LivingCostComparisonResponse` with helper methods that:
- calculate local daily cost in USD
- convert final display amounts to KRW
- calculate burden rates from USD amounts

**Step 4: Run test to verify it passes**

Run: `./gradlew test --tests "com.example.dahaeng.domain.livingcost.dto.response.compare.LivingCostComparisonResponseTest"`

Expected: PASS

### Task 2: Verify no regression in surrounding comparison flow

**Files:**
- Modify: `src/main/java/com/example/dahaeng/domain/livingcost/dto/response/compare/LivingCostComparisonResponse.java`
- Create: `src/main/java/com/example/dahaeng/domain/livingcost/dto/response/compare/LocalCostCompareResponse.java`
- Create: `src/main/java/com/example/dahaeng/domain/livingcost/dto/response/compare/AffordabilityCompareResponse.java`

**Step 1: Run focused verification**

Run: `./gradlew test --tests "com.example.dahaeng.domain.livingcost.dto.response.compare.LivingCostComparisonResponseTest"`

Expected: PASS

**Step 2: Run broader verification**

Run: `./gradlew test --tests "com.example.dahaeng.domain.livingcost.service.LivingCostOfCityServiceTest" --tests "com.example.dahaeng.domain.livingcost.controller.LivingCostControllerTest" --tests "com.example.dahaeng.domain.livingcost.dto.response.compare.LivingCostComparisonResponseTest"`

Expected: PASS or a concrete failure caused by changed response expectations.
