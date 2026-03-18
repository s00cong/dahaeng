package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;

public final class RecommendationScoreCalculator {

    private RecommendationScoreCalculator() {
    }

    public static ScoreBreakdown calculate(
            double tagRaw,
            RecommendCitiesRequest request,
            double avgFlightPrice,
            double livingCostFor1Day,
            String dangerAttention,
            String dangerAttentionPartial,
            Double cityNewsPenaltyScore
    ) {
        double tagScore = Math.min(55.0, Math.max(0.0, tagRaw) * 55.0);
        double budgetScore = calculateBudgetScore(request, avgFlightPrice, livingCostFor1Day);
        double safetyScore = calculateSafetyScore(dangerAttention, dangerAttentionPartial);
        double newsPenaltyScore = -Math.min(15.0, Math.max(0.0, nz(cityNewsPenaltyScore)));
        double finalScore = clamp(tagScore + budgetScore + safetyScore + newsPenaltyScore, 0.0, 100.0);

        return new ScoreBreakdown(finalScore, budgetScore, safetyScore, tagScore, newsPenaltyScore);
    }

    private static double calculateBudgetScore(
            RecommendCitiesRequest request,
            double avgFlightPrice,
            double livingCostFor1Day
    ) {
        if (request == null || request.userDailyBudget() == null || request.travelDays() == null || request.travelDays() <= 0) {
            return 0.0;
        }

        double totalBudget = request.userDailyBudget() * request.travelDays();
        if (totalBudget <= 0) {
            return 0.0;
        }

        double expectedTotalCost = avgFlightPrice + (livingCostFor1Day * request.travelDays());
        double ratio = (totalBudget - expectedTotalCost) / totalBudget;

        return ratio >= 0
                ? Math.min(25.0, ratio * 25.0)
                : Math.max(-25.0, (ratio / 0.3) * 25.0);
    }

    private static double calculateSafetyScore(String dangerAttention, String dangerAttentionPartial) {
        return hasText(dangerAttention) || hasText(dangerAttentionPartial) ? 7.5 : 15.0;
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
