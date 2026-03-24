package com.example.dahaeng.domain.flightalert.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.example.dahaeng.domain.flight.document.FlightPriceCalendar;
import com.example.dahaeng.domain.flight.repository.FlightPriceCalendarRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FlightAlertPriceService {
	private static final int SEARCH_MONTHS = 6;
	private static final int MIN_TRIP_DAYS = 3;
	private static final int MAX_TRIP_DAYS = 7;

	private final FlightPriceCalendarRepository flightPriceCalendarRepository;

	public Optional<RoundTripPriceMatch> findLowestRoundTrip(Long cityId) {
		List<RoundTripPriceMatch> candidates = new ArrayList<>();
		YearMonth startMonth = YearMonth.now();

		for (int offset = 0; offset < SEARCH_MONTHS; offset++) {
			YearMonth currentMonth = startMonth.plusMonths(offset);
			Optional<FlightPriceCalendar> outboundCalendar = findLatestCalendar(cityId, currentMonth);
			if (outboundCalendar.isEmpty()) {
				continue;
			}

			List<InboundSource> inboundSources = new ArrayList<>();
			findLatestCalendar(cityId, currentMonth).ifPresent(calendar -> inboundSources.add(new InboundSource(calendar)));
			findLatestCalendar(cityId, currentMonth.plusMonths(1))
				.ifPresent(calendar -> inboundSources.add(new InboundSource(calendar)));

			for (FlightPriceCalendar.DailyPrice outbound : safeDailyPrices(outboundCalendar.get().getOutboundDailyPrices())) {
				if (outbound.getDate() == null || outbound.getPrice() == null) {
					continue;
				}
				LocalDate departureDate = LocalDate.parse(outbound.getDate());

				for (InboundSource inboundSource : inboundSources) {
					for (FlightPriceCalendar.DailyPrice inbound : safeDailyPrices(inboundSource.calendar().getInboundDailyPrices())) {
						if (inbound.getDate() == null || inbound.getPrice() == null) {
							continue;
						}
						LocalDate returnDate = LocalDate.parse(inbound.getDate());
						long tripDays = returnDate.toEpochDay() - departureDate.toEpochDay();
						if (tripDays < MIN_TRIP_DAYS || tripDays > MAX_TRIP_DAYS) {
							continue;
						}

						candidates.add(new RoundTripPriceMatch(
							outbound.getPrice() + inbound.getPrice(),
							departureDate.toString(),
							returnDate.toString(),
							laterCollectedDate(outboundCalendar.get(), inboundSource.calendar())
						));
					}
				}
			}
		}

		return candidates.stream()
			.min(Comparator
				.comparing(RoundTripPriceMatch::matchedPrice)
				.thenComparing(RoundTripPriceMatch::departureDate)
				.thenComparing(RoundTripPriceMatch::returnDate));
	}

	private Optional<FlightPriceCalendar> findLatestCalendar(Long cityId, YearMonth yearMonth) {
		return flightPriceCalendarRepository
			.findByCityIdAndYearMonthOrderByCollectedDateDesc(cityId, yearMonth.toString(), PageRequest.of(0, 1))
			.stream()
			.findFirst();
	}

	private List<FlightPriceCalendar.DailyPrice> safeDailyPrices(List<FlightPriceCalendar.DailyPrice> dailyPrices) {
		return dailyPrices == null ? List.of() : dailyPrices;
	}

	private String laterCollectedDate(FlightPriceCalendar first, FlightPriceCalendar second) {
		LocalDate firstDate = LocalDate.parse(first.getCollectedDate());
		LocalDate secondDate = LocalDate.parse(second.getCollectedDate());
		return firstDate.isAfter(secondDate) ? first.getCollectedDate() : second.getCollectedDate();
	}

	private record InboundSource(FlightPriceCalendar calendar) {
	}

	public record RoundTripPriceMatch(
		Integer matchedPrice,
		String departureDate,
		String returnDate,
		String collectedDate
	) {
	}
}
