package com.example.dahaeng.domain.recommend.dto.response;

import java.util.List;
import java.util.Map;

public record RecommendCitiesResponse(
        String status,
        Data data
) {
    public record Data(List<RecommendationItem> recommendations){}

    public record RecommendationItem(
            int rank,
            String country,
            String city,
            Scores scores,
            String recommendationReason,
            PriceInfo priceInfo,
            FlightInfo flightInfo,
            NewsInsight newsInsight,
            List<RecommendedPlace> recommendedPlaces
    ){}

    public record Scores(
            Double totalScore,
            Double budgetScore,
            Double safetyScore,
            Double tagMatchScore,
            Double newPenaltyScore
    ){}

    public record PriceInfo(
            String currency,
            Double averageDailyAccommodation,
            Double averageDailyMealsAndTransport
    ){}

    public record FlightInfo(
            String departureAirport,
            String arrivalAirport,
            Integer estimatedPrice,
            String airline
    ){}

    public record NewsInsight(
            String summary,
            List<Article> articles
    ){}

    public record Article(
            String title,
            String url,
            String imageUrl,
            String description,
            String content,
            String publishedAt
    ){}

    public record RecommendedPlace(
            String placeName,
            String placeNameKo,
            List<String> categoryTags,
            Map<String, Double> tagScores,
            String address,
            String websiteUrl,
            String socialUrl,
            Location location
    ){}

    public record Location(
            Double lat,
            Double lon
    ){}
}
