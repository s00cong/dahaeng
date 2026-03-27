package com.example.dahaeng.domain.city.dto.response;

import java.util.List;

import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;

public record NotRecommendCityDetailResponse(
        Long id,
        String name,
        LivingCostFor1Day livingCostFor1Day,
        AirTicketAndHotel airTicketAndHotel,
        ExchangeRate exchangeRate,
        CountryDangerResponse danger,
        List<TagResponse> tags
) {
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

    public record TagResponse(
            String name,
            Double tagScore
    ){}

}
