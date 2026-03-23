package com.example.dahaeng.domain.flight.controller;

import com.example.dahaeng.domain.flight.dto.CalendarResponseDto;
import com.example.dahaeng.domain.flight.dto.CitySummaryResponseDto;
import com.example.dahaeng.domain.flight.dto.TrendResponseDto;
import com.example.dahaeng.domain.flight.service.FlightService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FlightController {

    private final FlightService flightService;

    @GetMapping("/flights/calendar/{cityId}")
    public ResponseEntity<CalendarResponseDto> getCalendar(
            @PathVariable("cityId") Long cityId,
            @RequestParam(value = "year_month", required = false) String yearMonth) {

        return ResponseEntity.ok(flightService.getCalendarWithHistory(cityId, yearMonth));
    }

    @GetMapping("/flights/trend/{cityId}")
    public ResponseEntity<TrendResponseDto> getTrend(@PathVariable("cityId") Long cityId) {
        return ResponseEntity.ok(flightService.getSixMonthTrend(cityId));
    }

    @GetMapping("/cities/{cityId}/summary")
    public ResponseEntity<CitySummaryResponseDto> getCitySummary(
            @PathVariable("cityId") Long cityId,
            @RequestParam(value = "year_month", required = false) String yearMonth) {

        return ResponseEntity.ok(flightService.getCitySummary(cityId, yearMonth));
    }
}
