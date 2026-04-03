package com.example.dahaeng.domain.flightalert.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.dahaeng.domain.flight.document.FlightPriceCalendar;
import com.example.dahaeng.domain.flightalert.entity.AlertType;
import com.example.dahaeng.domain.flight.repository.FlightPriceCalendarRepository;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.Test;

class FlightAlertPriceServiceTest {

    @Test
    void findAlertCandidate_usesOutboundDailyPricesWithoutRoundTripCalculation() throws Exception {
        FlightPriceCalendarRepository repository = mock(FlightPriceCalendarRepository.class);
        FlightAlertPriceService service = new FlightAlertPriceService(repository);
        Long cityId = 1L;

        String currentMonth = YearMonth.now().toString();

        FlightPriceCalendar current = calendar(
                cityId,
                currentMonth,
                "2026-03-20",
                List.of(
                        dailyPrice("2026-03-28", 220_000),
                        dailyPrice("2026-03-30", 245_000),
                        dailyPrice("2026-04-01", 280_000)
                ),
                List.of()
        );

        when(repository.findByCityIdAndYearMonthOrderByCollectedDateDesc(eq(cityId), eq(currentMonth), eq(org.springframework.data.domain.PageRequest.of(0, 1))))
                .thenReturn(List.of(current));
        for (int i = 1; i < 6; i++) {
            String yearMonth = YearMonth.now().plusMonths(i).toString();
            when(repository.findByCityIdAndYearMonthOrderByCollectedDateDesc(eq(cityId), eq(yearMonth), eq(org.springframework.data.domain.PageRequest.of(0, 1))))
                    .thenReturn(List.of());
        }

        FlightAlertPriceService.AlertCandidate result = service.findAlertCandidate(cityId, 250_000).orElseThrow();

        assertThat(result.alertType()).isEqualTo(AlertType.TARGET_HIT);
        assertThat(result.matchedPrice()).isEqualTo(220_000);
        assertThat(result.nearestMatchDate()).isEqualTo(LocalDate.parse("2026-03-28"));
        assertThat(result.bestPriceDate()).isEqualTo(LocalDate.parse("2026-03-28"));
        assertThat(result.matchedDateCount()).isEqualTo(2);
        assertThat(result.collectedAt()).isEqualTo(LocalDateTime.parse("2026-03-20T00:00:00"));
    }

    @Test
    void findAlertCandidate_countsNearTargetMatchesWhenThresholdNotReached() throws Exception {
        FlightPriceCalendarRepository repository = mock(FlightPriceCalendarRepository.class);
        FlightAlertPriceService service = new FlightAlertPriceService(repository);
        Long cityId = 1L;

        String currentMonth = YearMonth.now().toString();

        FlightPriceCalendar current = calendar(
                cityId,
                currentMonth,
                "2026-03-20",
                List.of(
                        dailyPrice("2026-03-28", 320_000),
                        dailyPrice("2026-03-30", 315_000),
                        dailyPrice("2026-04-01", 340_000)
                )
                ,
                List.of()
        );

        when(repository.findByCityIdAndYearMonthOrderByCollectedDateDesc(eq(cityId), eq(currentMonth), eq(org.springframework.data.domain.PageRequest.of(0, 1))))
                .thenReturn(List.of(current));
        for (int i = 1; i < 6; i++) {
            String yearMonth = YearMonth.now().plusMonths(i).toString();
            when(repository.findByCityIdAndYearMonthOrderByCollectedDateDesc(eq(cityId), eq(yearMonth), eq(org.springframework.data.domain.PageRequest.of(0, 1))))
                    .thenReturn(List.of());
        }

        FlightAlertPriceService.AlertCandidate result = service.findAlertCandidate(cityId, 305_000).orElseThrow();

        assertThat(result.alertType()).isEqualTo(AlertType.NEAR_TARGET);
        assertThat(result.matchedPrice()).isEqualTo(315_000);
        assertThat(result.nearestMatchDate()).isEqualTo(LocalDate.parse("2026-03-28"));
        assertThat(result.bestPriceDate()).isEqualTo(LocalDate.parse("2026-03-30"));
        assertThat(result.matchedDateCount()).isEqualTo(2);
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
