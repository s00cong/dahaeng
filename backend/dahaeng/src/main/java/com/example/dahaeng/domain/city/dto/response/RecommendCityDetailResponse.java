package com.example.dahaeng.domain.city.dto.response;


import java.util.Map;
import java.util.List;
import java.util.UUID;

import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;

public record RecommendCityDetailResponse(
    String name,
    Score score,
    String recommendationReason,
    boolean isRecommended,
    LivingCostFor1Day livingCostFor1Day,
    AirTicketAndHotel airTicketAndHotel,
    ExchangeRate exchangeRate,
    News news,
    CountryDangerResponse danger,
    List<TagResponse> tags,
    List<TouristSpotResponse> touristSpot
) {
    public record Score(
            Double finalScore,
            Double budgetScore,
            Double safetyScore,
            Double tagMatchScore,
            Double newPenaltyScore
    ){}


    public record LivingCostFor1Day(
            Food food,
            Transportation transportation,
            double hotel,
            double total
    ){
    }

    public record Food(
            double total,
            double breakfast,
            double lunch,
            double dinner,
            double cappuccino,
            double cokePepsi
    ){
    }

    public record Transportation(
            double total,
            double localTransportTicket,
            double ticketCount
    ){
    }
    public record AirTicketAndHotel(
            double airTicket,
            double hotel
    ){}
    public record ExchangeRate(
            String currency,
            Double krwPerDisplayUnit,
            String eventDate
    ){}
    public record News(
            String summation,
            List<NewsItem> top3
    ){}

    public record NewsItem(
            String title,
            String url,
            String content,
            String description,
            String urlToImage,
            String publishedAt
    ){}

    public record TagResponse(
            String name,
            Double tagScore
    ){}

    public record TouristSpotResponse(
            String name,
            Double lat,
            Double lon,
            String address,
            String websiteUrl,
            String socialUrl,
            List<String> tags,
            Double spotScore,
            Map<String, Double> tagScores
    ) { }
}
