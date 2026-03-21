package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.city.repository.CityTagRepository;
import com.example.dahaeng.domain.city.repository.CityClimateTagRepository;
import com.example.dahaeng.domain.country.dto.response.CountryDanger;
import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;
import com.example.dahaeng.domain.country.service.DangerService;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;
import com.example.dahaeng.domain.recommend.dto.response.RecommendCitySummaryResponse;
import com.example.dahaeng.domain.recommend.repository.CityCandidateProjection;
import com.example.dahaeng.domain.recommend.repository.RecommendQueryRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RecommendFacadeTest {

    @Test
    void recommend_excludesSouthKoreaAndIncludesScoreBreakdown() {
        RecommendQueryRepository recommendQueryRepository = mock(RecommendQueryRepository.class);
        CityTagRepository cityTagRepository = mock(CityTagRepository.class);
        CityClimateTagRepository cityClimateTagRepository = mock(CityClimateTagRepository.class);
        DangerService dangerService = mock(DangerService.class);
        ExchangeRepository exchangeRepository = mock(ExchangeRepository.class);
        RecommendFacade recommendFacade = new RecommendFacade(
                recommendQueryRepository,
                cityTagRepository,
                cityClimateTagRepository,
                dangerService,
                exchangeRepository
        );

        when(cityTagRepository.findAllByTagNames(List.of("food"))).thenReturn(List.of());
        when(cityClimateTagRepository.findAllByMonthAndTagNames(4L, List.of())).thenReturn(List.of());
        when(exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD))
                .thenReturn(Optional.of(Exchange.builder()
                        .currency(Currency.USD)
                        .krwPer1cur(1400.0)
                        .build()));
        when(recommendQueryRepository.findCityCandidates(anyString())).thenReturn(List.of(
                city(1L, 82L, "Seoul", "South Korea", 500, 100, 20.0, 30.0, 5.0, 3.0, 6.0, null, null, null),
                city(2L, 86L, "Tokyo", "Japan", 300000, 120000, 20.0, 50.0, 6.0, 3.0, 5.0, null, null, null),
                city(3L, 44L, "Osaka", "Japan", 280000, 100000, 18.0, 40.0, 5.0, 2.0, 5.0, null, null, null)
        ));
        when(dangerService.dangers(anyLong())).thenReturn(
                new CountryDangerResponse("Test Country", List.of(new CountryDanger("safe", "ok")))
        );

        RecommendCitySummaryResponse response = recommendFacade.recommend(
                new RecommendCitiesRequest(List.of("food"), 500000.0, 2, 4, null)
        );

        assertThat(response.recommendId()).isNotNull();
        assertThat(response.recommendations())
                .extracting(RecommendCitySummaryResponse.RecommendationItem::name)
                .doesNotContain("Seoul")
                .containsExactlyInAnyOrder("Tokyo", "Osaka");

        RecommendCitySummaryResponse.Scores scores = response.recommendations().get(0).scores();
        assertThat(scores).isNotNull();
        assertThat(scores.total()).isNotNull();
        assertThat(scores.tag()).isNotNull();
        assertThat(scores.budget()).isNotNull();
        assertThat(scores.safety()).isNotNull();
        assertThat(scores.newsPenalty()).isNotNull();
        assertThat(response.recommendations().get(0).livingCostFor1Day()).isNotNull();
    }

    private static CityCandidateProjection city(
            Long cityId,
            Long countryId,
            String cityName,
            String countryName,
            Integer avgFlightPrice,
            Integer avgHotelPrice,
            Double lunchMenu,
            Double dinnerInAResturantFor2,
            Double cappuccino,
            Double cokePepsi,
            Double localTransportTicket,
            String dangerAttention,
            String dangerControl,
            String dangerLimita
    ) {
        return new CityCandidateProjection() {
            @Override
            public Long getCityId() {
                return cityId;
            }

            @Override
            public Long getCountryId() {
                return countryId;
            }

            @Override
            public String getCityName() {
                return cityName;
            }

            @Override
            public String getCountryName() {
                return countryName;
            }

            @Override
            public String getCityImageUrl() {
                return null;
            }

            @Override
            public String getDescription() {
                return null;
            }

            @Override
            public Double getLat() {
                return 0.0;
            }

            @Override
            public Double getLon() {
                return 0.0;
            }

            @Override
            public Double getNewsPenaltyScore() {
                return 0.0;
            }

            @Override
            public Integer getAvgFlightPrice() {
                return avgFlightPrice;
            }

            @Override
            public Integer getAvgHotelPrice() {
                return avgHotelPrice;
            }

            @Override
            public Double getLunchMenu() {
                return lunchMenu;
            }

            @Override
            public Double getDinnerInAResturantFor2() {
                return dinnerInAResturantFor2;
            }

            @Override
            public Double getCappuccino() {
                return cappuccino;
            }

            @Override
            public Double getCokePepsi() {
                return cokePepsi;
            }

            @Override
            public Double getLocalTransportTicket() {
                return localTransportTicket;
            }

            @Override
            public String getDangerAttention() {
                return dangerAttention;
            }

            @Override
            public String getDangerAttentionPartial() {
                return null;
            }

            @Override
            public String getDangerControl() {
                return dangerControl;
            }

            @Override
            public String getDangerLimita() {
                return dangerLimita;
            }

            @Override
            public String getCurrency() {
                return "JPY";
            }

            @Override
            public String getOriginAirport() {
                return "ICN";
            }
        };
    }
}
