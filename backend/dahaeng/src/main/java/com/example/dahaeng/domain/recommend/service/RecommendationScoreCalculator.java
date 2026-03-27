package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;

public final class RecommendationScoreCalculator {

    private static final double TAG_SCORE_MAX = 50.0;
    private static final double TAG_AVERAGE_WEIGHT = 0.55;
    private static final double TAG_MATCH_RATE_WEIGHT = 0.45;
    private static final double BUDGET_SCORE_MAX = 40.0;
    private static final double BUDGET_IDEAL_RATIO = 0.95;
    private static final double BUDGET_MIN_RATIO = 0.30;
    private static final double BUDGET_MAX_RATIO = 1.30;

    private RecommendationScoreCalculator() {
    }

    public static ScoreBreakdown calculate(
            double tagAverage,
            double tagMatchRate,
            RecommendCitiesRequest request,
            double avgFlightPrice,
            double livingCostFor1Day,
            String dangerAttention,
            String dangerAttentionPartial,
            String dangerControlPartial,
            String dangerLimitaPartial,
            String dangerEvacuateRegionTy,
            String dangerForbiddenRegionTy,
            Double cityNewsPenaltyScore
    ) {
        double tagScore = calculateTagScore(tagAverage, tagMatchRate);
        double budgetScore = calculateBudgetScore(request, avgFlightPrice, livingCostFor1Day);
        double safetyScore = calculateSafetyScore(
                dangerAttention,
                dangerAttentionPartial,
                dangerControlPartial,
                dangerLimitaPartial,
                dangerEvacuateRegionTy,
                dangerForbiddenRegionTy
        );
        double newsPenaltyScore = -Math.min(5.0, Math.max(0.0, nz(cityNewsPenaltyScore)));
        double finalScore = clamp(tagScore + budgetScore + safetyScore + newsPenaltyScore, 0.0, 100.0);

        return new ScoreBreakdown(finalScore, budgetScore, safetyScore, tagScore, newsPenaltyScore);
    }

    private static double calculateTagScore(double tagAverage, double tagMatchRate) {
        double normalizedAverage = clamp(tagAverage, 0.0, 1.0);
        double normalizedMatchRate = clamp(tagMatchRate, 0.0, 1.0);
        double blendedTagRaw = (normalizedAverage * TAG_AVERAGE_WEIGHT)
                + (normalizedMatchRate * TAG_MATCH_RATE_WEIGHT);
        return Math.min(TAG_SCORE_MAX, blendedTagRaw * TAG_SCORE_MAX);
    }

    private static double calculateBudgetScore(
            RecommendCitiesRequest request,
            double avgFlightPrice,
            double livingCostFor1Day
    ) {
        if (request == null || request.userTotalBudget() == null || request.travelDays() == null || request.travelDays() <= 0) {
            return 0.0;
        }

        double totalBudget = request.userTotalBudget();
        if (totalBudget <= 0) {
            return 0.0;
        }

        double expectedTotalCost = avgFlightPrice + (livingCostFor1Day * request.travelDays());
        double costBudgetRatio = expectedTotalCost / totalBudget;

        if (costBudgetRatio <= BUDGET_MIN_RATIO || costBudgetRatio >= BUDGET_MAX_RATIO) {
            return 0.0;
        }

        // Ideal-point model: the score peaks near the user's target budget and falls off on both sides.
        double normalizedDistance = costBudgetRatio <= BUDGET_IDEAL_RATIO
                ? (BUDGET_IDEAL_RATIO - costBudgetRatio) / (BUDGET_IDEAL_RATIO - BUDGET_MIN_RATIO)
                : (costBudgetRatio - BUDGET_IDEAL_RATIO) / (BUDGET_MAX_RATIO - BUDGET_IDEAL_RATIO);
        double curvedScore = 1.0 - Math.pow(normalizedDistance, 2);
        return clamp(curvedScore, 0.0, 1.0) * BUDGET_SCORE_MAX;
    }

    private static double calculateSafetyScore(
            String dangerAttention,
            String dangerAttentionPartial,
            String dangerControlPartial,
            String dangerLimitaPartial,
            String dangerEvacuateRegionTy,
            String dangerForbiddenRegionTy
    ) {
        if (hasText(dangerForbiddenRegionTy) || hasText(dangerControlPartial)) {
            return 5.0;
        }
        if (hasText(dangerEvacuateRegionTy) || hasText(dangerLimitaPartial)) {
            return 8.0;
        }
        if (hasText(dangerAttention)) {
            return 13.0;
        }
        if (hasText(dangerAttentionPartial)) {
            return 16.0;
        }
        return 20.0;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private static double nz(Number value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    public record ScoreBreakdown(
            double finalScore,
            double budgetScore,
            double safetyScore,
            double tagScore,
            double newsPenaltyScore
    ) {
    }
}
