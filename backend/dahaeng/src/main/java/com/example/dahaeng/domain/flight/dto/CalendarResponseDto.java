package com.example.dahaeng.domain.flight.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CalendarResponseDto {
    private Long cityId;
    private String yearMonth;
    private String updatedAt;
    private List<DailyPriceDto> outboundDailyPrices;
    private List<DailyPriceDto> inboundDailyPrices;

    @Getter
    @Builder
    public static class DailyPriceDto {
        private String date;
        private Integer price;
        private List<PriceHistoryDto> history;
    }

    @Getter
    @Builder
    public static class PriceHistoryDto {
        private String collectedDate;
        private Integer price;
    }
}
