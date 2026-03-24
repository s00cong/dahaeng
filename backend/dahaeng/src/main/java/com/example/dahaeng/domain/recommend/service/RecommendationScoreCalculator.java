package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;

public final class RecommendationScoreCalculator {

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
        double newsPenaltyScore = -Math.min(15.0, Math.max(0.0, nz(cityNewsPenaltyScore)));
        double finalScore = clamp(tagScore + budgetScore + safetyScore + newsPenaltyScore, 0.0, 100.0);

        return new ScoreBreakdown(finalScore, budgetScore, safetyScore, tagScore, newsPenaltyScore);
    }

    private static double calculateTagScore(double tagAverage, double tagMatchRate) {
        double normalizedAverage = clamp(tagAverage, 0.0, 1.0);
        double normalizedMatchRate = clamp(tagMatchRate, 0.0, 1.0);
        double blendedTagRaw = (normalizedAverage * 0.65) + (normalizedMatchRate * 0.35);
        return Math.min(55.0, blendedTagRaw * 55.0);
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
        double ratio = (totalBudget - expectedTotalCost) / totalBudget;

        return ratio >= 0
                ? Math.min(18.0, ratio * 18.0)
                : Math.max(-30.0, (ratio / 0.3) * 30.0);
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
            return 4.0;
        }
        if (hasText(dangerEvacuateRegionTy) || hasText(dangerLimitaPartial)) {
            return 6.0;
        }
        if (hasText(dangerAttention)) {
            return 10.0;
        }
        if (hasText(dangerAttentionPartial)) {
            return 12.0;
        }
        return 15.0;
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
