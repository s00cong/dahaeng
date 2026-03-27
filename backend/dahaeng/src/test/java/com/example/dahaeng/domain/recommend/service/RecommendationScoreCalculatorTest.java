package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RecommendationScoreCalculatorTest {

    @Test
    void budgetScore_peaksNearBudgetAndDropsWhenTooCheapOrTooExpensive() {
        RecommendCitiesRequest request = request(1_000_000.0, 1);

        double tooCheap = calculateBudgetScore(request, 200_000.0);
        double nearIdeal = calculateBudgetScore(request, 950_000.0);
        double nearBudget = calculateBudgetScore(request, 1_000_000.0);
        double expensiveButStillConsidered = calculateBudgetScore(request, 1_100_000.0);
        double tooExpensive = calculateBudgetScore(request, 1_200_000.0);
        double muchTooExpensive = calculateBudgetScore(request, 1_300_000.0);

        assertThat(tooCheap).isZero();
        assertThat(nearIdeal).isEqualTo(40.0);
        assertThat(nearBudget).isBetween(38.0, 39.0);
        assertThat(expensiveButStillConsidered).isBetween(25.0, 26.0);
        assertThat(tooExpensive).isZero();
        assertThat(muchTooExpensive).isZero();
    }

    @Test
    void tagScore_usesLowerMaximumWeightThanBefore() {
        RecommendationScoreCalculator.ScoreBreakdown score = RecommendationScoreCalculator.calculate(
                1.0,
                1.0,
                request(1_000_000.0, 1),
                0.0,
                950_000.0,
                null,
                null,
                null,
                null,
                null,
                null,
                0.0
        );

        assertThat(score.tagScore()).isEqualTo(50.0);
        assertThat(score.budgetScore()).isEqualTo(40.0);
    }

    private static double calculateBudgetScore(RecommendCitiesRequest request, double expectedTotalCost) {
        RecommendationScoreCalculator.ScoreBreakdown score = RecommendationScoreCalculator.calculate(
                0.0,
                0.0,
                request,
                0.0,
                expectedTotalCost,
                null,
                null,
                null,
                null,
                null,
                null,
                0.0
        );
        return score.budgetScore();
    }

    private static RecommendCitiesRequest request(double totalBudget, int travelDays) {
        return new RecommendCitiesRequest(List.of("food"), totalBudget, travelDays, 4, UUID.randomUUID());
    }
}
