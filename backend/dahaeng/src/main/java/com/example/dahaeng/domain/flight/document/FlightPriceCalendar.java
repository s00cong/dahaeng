package com.example.dahaeng.domain.flight.document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

@Document(collection = "flight_price_calendar")
@Getter
@NoArgsConstructor
public class FlightPriceCalendar {

    @Id
    private String id; // e.g., "6920208-2026-05-20260309"

    @Field("cityId")
    private Long cityId;

    @Field("yearMonth")
    private String yearMonth;

    @Field("collectedDate")
    private String collectedDate; // YYYY-MM-DD

    @Field("outboundDailyPrices")
    private List<DailyPrice> outboundDailyPrices;

    @Field("inboundDailyPrices")
    private List<DailyPrice> inboundDailyPrices;

    @Getter
    @NoArgsConstructor
    public static class DailyPrice {
        private String date;
        private Integer price;
    }
}
