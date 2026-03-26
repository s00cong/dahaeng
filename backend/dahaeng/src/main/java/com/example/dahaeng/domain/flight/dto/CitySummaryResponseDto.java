package com.example.dahaeng.domain.flight.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CitySummaryResponseDto {
    private Long cityId;
    private String cityNameKr;
    private String cityNameEn;
    private String countryNameKr;
    private String cityImageUrl;
    private Integer avgFlightPrice;
    private Integer avgHotelPrice;
    private String typicalStopsText;
    private String minDurationText;
    private List<Integer> peakSeasonMonths;
    private List<Integer> offSeasonMonths;
}
