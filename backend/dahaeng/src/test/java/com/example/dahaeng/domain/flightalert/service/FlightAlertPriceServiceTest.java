package com.example.dahaeng.domain.flightalert.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.dahaeng.domain.flight.document.FlightPriceCalendar;
import com.example.dahaeng.domain.flight.repository.FlightPriceCalendarRepository;
import java.lang.reflect.Field;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.Test;

class FlightAlertPriceServiceTest {

    @Test
    void findLowestRoundTrip_prefersCheapestValidCombinationAcrossMonthBoundary() throws Exception {
        FlightPriceCalendarRepository repository = mock(FlightPriceCalendarRepository.class);
        FlightAlertPriceService service = new FlightAlertPriceService(repository);
        Long cityId = 1L;

        String currentMonth = YearMonth.now().toString();
        String nextMonth = YearMonth.now().plusMonths(1).toString();

        FlightPriceCalendar current = calendar(
                cityId,
                currentMonth,
                "2026-03-20",
                List.of(
                        dailyPrice("2026-03-28", 100_000),
                        dailyPrice("2026-03-30", 200_000)
                ),
                List.of(
                        dailyPrice("2026-03-31", 150_000)
                )
        );
        FlightPriceCalendar next = calendar(
                cityId,
                nextMonth,
                "2026-03-21",
                List.of(),
                List.of(
                        dailyPrice("2026-04-02", 120_000),
                        dailyPrice("2026-04-05", 80_000)
                )
        );

        when(repository.findByCityIdAndYearMonthOrderByCollectedDateDesc(eq(cityId), eq(currentMonth), eq(org.springframework.data.domain.PageRequest.of(0, 1))))
                .thenReturn(List.of(current));
        when(repository.findByCityIdAndYearMonthOrderByCollectedDateDesc(eq(cityId), eq(nextMonth), eq(org.springframework.data.domain.PageRequest.of(0, 1))))
                .thenReturn(List.of(next));
        for (int i = 2; i < 6; i++) {
            String yearMonth = YearMonth.now().plusMonths(i).toString();
            when(repository.findByCityIdAndYearMonthOrderByCollectedDateDesc(eq(cityId), eq(yearMonth), eq(org.springframework.data.domain.PageRequest.of(0, 1))))
                    .thenReturn(List.of());
        }

        FlightAlertPriceService.RoundTripPriceMatch result = service.findLowestRoundTrip(cityId).orElseThrow();

        assertThat(result.matchedPrice()).isEqualTo(220_000);
        assertThat(result.departureDate()).isEqualTo("2026-03-28");
        assertThat(result.returnDate()).isEqualTo("2026-04-02");
        assertThat(result.collectedDate()).isEqualTo("2026-03-21");
    }

    private static FlightPriceCalendar calendar(
            Long cityId,
            String yearMonth,
            String collectedDate,
            List<FlightPriceCalendar.DailyPrice> outbound,
            List<FlightPriceCalendar.DailyPrice> inbound
    ) throws Exception {
        FlightPriceCalendar calendar = new FlightPriceCalendar();
        setField(calendar, "cityId", cityId);
        setField(calendar, "yearMonth", yearMonth);
        setField(calendar, "collectedDate", collectedDate);
        setField(calendar, "outboundDailyPrices", outbound);
        setField(calendar, "inboundDailyPrices", inbound);
        return calendar;
    }

    private static FlightPriceCalendar.DailyPrice dailyPrice(String date, Integer price) throws Exception {
        FlightPriceCalendar.DailyPrice dailyPrice = new FlightPriceCalendar.DailyPrice();
        setField(dailyPrice, "date", date);
        setField(dailyPrice, "price", price);
        return dailyPrice;
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }
}
