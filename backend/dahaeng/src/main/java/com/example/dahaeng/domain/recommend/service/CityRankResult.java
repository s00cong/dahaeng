package com.example.dahaeng.domain.recommend.service;

public record CityRankResult(
        Long cityId,
        Long countryId,
        String countryName,
        String cityName,
        String cityImageUrl,
        Double totalScore,
        Double budgetScore,
        Double safetyScore,
        Double tagScore,
        Double newsPenaltyScore,
        String currency,
        Double hotelPerDay,
        Double dailyLocalCost,
        String originAirport,
        Integer flightPrice,
        String description,
        Double lat,
        Double lon
) {
}
