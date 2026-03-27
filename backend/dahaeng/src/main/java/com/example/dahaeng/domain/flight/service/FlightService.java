package com.example.dahaeng.domain.flight.service;

import com.example.dahaeng.domain.flight.document.FlightPriceCalendar;
import com.example.dahaeng.domain.flight.dto.CalendarResponseDto;
import com.example.dahaeng.domain.flight.dto.CitySummaryResponseDto;
import com.example.dahaeng.domain.flight.dto.TrendResponseDto;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.flight.entity.FlightSummary;
import com.example.dahaeng.domain.flight.repository.FlightPriceCalendarRepository;
import com.example.dahaeng.domain.flight.repository.FlightSummaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FlightService {

    private final FlightSummaryRepository flightSummaryRepository;
    private final FlightPriceCalendarRepository flightPriceCalendarRepository;

    public CalendarResponseDto getCalendarWithHistory(Long cityId, String yearMonth) {
        yearMonth = resolveYearMonth(yearMonth);
        List<FlightPriceCalendar> calendars = flightPriceCalendarRepository
                .findByCityIdAndYearMonthOrderByCollectedDateDesc(cityId, yearMonth, PageRequest.of(0, 15));
        calendars = sortCalendarsByCollectedDateDesc(calendars);

        if (calendars.isEmpty()) {
            return CalendarResponseDto.builder()
                .cityId(cityId)
                .yearMonth(yearMonth)
                .updatedAt(null)
                .outboundDailyPrices(Collections.emptyList())
                .inboundDailyPrices(Collections.emptyList())
                .build();
        }

        FlightPriceCalendar latest = calendars.get(0);
        List<CalendarResponseDto.DailyPriceDto> outbound = buildDailyPricesWithHistory(calendars, true);
        List<CalendarResponseDto.DailyPriceDto> inbound = buildDailyPricesWithHistory(calendars, false);

        return CalendarResponseDto.builder()
            .cityId(cityId)
            .yearMonth(yearMonth)
            .updatedAt(latest.getCollectedDate() + "T00:00:00Z")
            .outboundDailyPrices(outbound)
            .inboundDailyPrices(inbound)
            .build();
    }

    private List<CalendarResponseDto.DailyPriceDto> buildDailyPricesWithHistory(List<FlightPriceCalendar> calendars,boolean isOutbound) {
            FlightPriceCalendar latest = calendars.get(0);
            List<FlightPriceCalendar.DailyPrice> basePrices = isOutbound ? latest.getOutboundDailyPrices() : latest.getInboundDailyPrices();

        if (basePrices == null)
            return Collections.emptyList();

        List<Map<String, Integer>> priceMaps = calendars.stream()
                .map(cal -> toDailyPriceMap(isOutbound ? cal.getOutboundDailyPrices(): cal.getInboundDailyPrices()))
                .toList();

        List<CalendarResponseDto.DailyPriceDto> result = new ArrayList<>();

        for (FlightPriceCalendar.DailyPrice daily : basePrices) {
            String date = daily.getDate();
            Integer currentPrice = daily.getPrice();

            List<CalendarResponseDto.PriceHistoryDto> history = new ArrayList<>();
            for (int i = 0; i < calendars.size(); i++) {
                Integer price = priceMaps.get(i).get(date);
                if (price != null) {
                    FlightPriceCalendar cal = calendars.get(i);
                    history.add(CalendarResponseDto.PriceHistoryDto.builder()
                        .collectedDate(cal.getCollectedDate())
                        .price(price)
                        .build());
                }
            }

            result.add(CalendarResponseDto.DailyPriceDto.builder()
                .date(date)
                .price(currentPrice)
                .history(history)
                .build());
        }
        return result;
    }

    private List<FlightPriceCalendar> sortCalendarsByCollectedDateDesc(List<FlightPriceCalendar> calendars) {
        return calendars.stream()
            .sorted(Comparator.comparing(FlightPriceCalendar::getCollectedDate).reversed())
            .toList();
    }

    private Map<String, Integer> toDailyPriceMap(List<FlightPriceCalendar.DailyPrice> prices) {
        if (prices == null || prices.isEmpty()) {
            return Collections.emptyMap();
        }

        return prices.stream()
            .filter(price -> price.getDate() != null && price.getPrice() != null)
            .collect(Collectors.toMap(
                FlightPriceCalendar.DailyPrice::getDate,
                FlightPriceCalendar.DailyPrice::getPrice,
                (left, right) -> left,
                LinkedHashMap::new));
    }

    public TrendResponseDto getSixMonthTrend(Long cityId) {
        String currentYearMonth = YearMonth.now().toString();

        List<FlightSummary> summaries = flightSummaryRepository.findByCityIdAndYearMonthGreaterThanEqualOrderByYearMonthAsc(
            cityId, currentYearMonth, PageRequest.of(0, 6));

        List<TrendResponseDto.MonthlyTrendDto> trendData = summaries.stream()
            .map(s -> TrendResponseDto.MonthlyTrendDto.builder()
                .yearMonth(s.getYearMonth())
                .avgFlightPrice(s.getAvgFlightPrice())
                .avgHotelPrice(s.getAvgHotelPrice())
                .build())
            .collect(Collectors.toList());

        return TrendResponseDto.builder()
            .cityId(cityId)
            .trendData(trendData)
            .build();
    }

    public CitySummaryResponseDto getCitySummary(Long cityId, String yearMonth) {
        yearMonth = resolveYearMonth(yearMonth);
        Optional<FlightSummary> summaryOpt = flightSummaryRepository.findByCityIdAndYearMonthWithCity(cityId,yearMonth);

        if (summaryOpt.isEmpty()) {
            return CitySummaryResponseDto.builder()
                .cityId(cityId)
                .build();
        }

        FlightSummary summary = summaryOpt.get();
        City city = summary.getCity();

        return CitySummaryResponseDto.builder()
            .cityId(cityId)
            .cityNameKr(city.getCityName())
            .cityNameEn(city.getCityName())
            .countryNameKr(city.getCountry() != null ? city.getCountry().getCountryName() : "")

            .cityImageUrl(city.getImgUrl())
            .avgFlightPrice(summary.getAvgFlightPrice())
            .avgHotelPrice(summary.getAvgHotelPrice())
            .typicalStopsText(summary.getStops() == null || summary.getStops() == 0 ? "직항"
                    : "경유 " + summary.getStops() + "회")
            .avgDurationText(formatDuration(summary.getFlightDuration()))
            .peakSeasonMonths(parseMonthList(summary.getPeakMonthList()))
            .offSeasonMonths(parseMonthList(summary.getOffMonthList()))
            .build();
    }

    private String formatDuration(Integer minutes) {
        if (minutes == null)
            return "-";
        int h = minutes / 60;
        int m = minutes % 60;
        return h + "시간 " + m + "분";
    }

    private List<Integer> parseMonthList(String monthListStr) {
        if (monthListStr == null || monthListStr.isBlank())
            return Collections.emptyList();
        return Arrays.stream(monthListStr.split(","))
            .map(String::trim)
            .filter(token -> !token.isBlank())
            .map(token -> {
                try {
                    return Integer.parseInt(token);
                } catch (NumberFormatException e) {
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    private String resolveYearMonth(String yearMonth) {
        if (yearMonth == null || yearMonth.isBlank()) {
            return YearMonth.now().toString();
        }
        return yearMonth;
    }
}
