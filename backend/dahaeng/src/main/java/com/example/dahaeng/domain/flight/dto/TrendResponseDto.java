package com.example.dahaeng.domain.flight.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class TrendResponseDto {
    private Long cityId;
    private List<MonthlyTrendDto> trendData;

    @Getter
    @Builder
    public static class MonthlyTrendDto {
        private String yearMonth;
        private Integer avgFlightPrice;
        private Integer avgHotelPrice;
    }
}
