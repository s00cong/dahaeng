package com.example.dahaeng.domain.flightalert.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.example.dahaeng.domain.flight.document.FlightPriceCalendar;
import com.example.dahaeng.domain.flight.repository.FlightPriceCalendarRepository;
import com.example.dahaeng.domain.flightalert.entity.AlertType;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FlightAlertPriceService {
	private static final int SEARCH_MONTHS = 6;
	private static final double NEAR_TARGET_MULTIPLIER = 1.05d;

	private final FlightPriceCalendarRepository flightPriceCalendarRepository;

	public Optional<AlertCandidate> findAlertCandidate(Long cityId, Integer thresholdPrice) {
		List<DailyPriceCandidate> candidates = findDailyCandidates(cityId);
		if (candidates.isEmpty()) {
			return Optional.empty();
		}

		int nearTargetUpperBound = (int)Math.floor(thresholdPrice * NEAR_TARGET_MULTIPLIER);
		List<DailyPriceCandidate> targetHitCandidates = candidates.stream()
			.filter(candidate -> candidate.matchedPrice() <= thresholdPrice)
			.toList();
		List<DailyPriceCandidate> matchedCandidates;
		AlertType alertType;
		if (!targetHitCandidates.isEmpty()) {
			matchedCandidates = targetHitCandidates;
			alertType = AlertType.TARGET_HIT;
		} else {
			matchedCandidates = candidates.stream()
				.filter(candidate -> candidate.matchedPrice() > thresholdPrice)
				.filter(candidate -> candidate.matchedPrice() <= nearTargetUpperBound)
				.toList();
			alertType = AlertType.NEAR_TARGET;
		}
		if (matchedCandidates.isEmpty()) {
			return Optional.empty();
		}

		DailyPriceCandidate bestPriceCandidate = matchedCandidates.stream()
			.min(Comparator
				.comparing(DailyPriceCandidate::matchedPrice)
				.thenComparing(DailyPriceCandidate::bestMatchDate))
			.orElseThrow();

		DailyPriceCandidate nearestCandidate = matchedCandidates.stream()
			.min(Comparator.comparing(DailyPriceCandidate::bestMatchDate))
			.orElseThrow();

		return Optional.of(new AlertCandidate(
			alertType,
			bestPriceCandidate.matchedPrice(),
			nearestCandidate.bestMatchDate(),
			bestPriceCandidate.bestMatchDate(),
			matchedCandidates.size(),
			bestPriceCandidate.collectedAt()
		));
	}

	private List<DailyPriceCandidate> findDailyCandidates(Long cityId) {
		List<DailyPriceCandidate> candidates = new ArrayList<>();
		YearMonth startMonth = YearMonth.now();

		for (int offset = 0; offset < SEARCH_MONTHS; offset++) {
			YearMonth currentMonth = startMonth.plusMonths(offset);
			Optional<FlightPriceCalendar> calendar = findLatestCalendar(cityId, currentMonth);
			if (calendar.isEmpty()) {
				continue;
			}

			for (FlightPriceCalendar.DailyPrice outbound : safeDailyPrices(calendar.get().getOutboundDailyPrices())) {
				if (outbound.getDate() == null || outbound.getPrice() == null) {
					continue;
				}
				candidates.add(new DailyPriceCandidate(
					outbound.getPrice(),
					parseToLocalDate(outbound.getDate()),
					parseToLocalDateTime(calendar.get().getCollectedDate())
				));
			}
		}

		return candidates;
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

	private LocalDate parseToLocalDate(String value) {
		try {
			return LocalDate.parse(value);
		} catch (DateTimeParseException ignored) {
			return LocalDateTime.parse(value).toLocalDate();
		}
	}

	private LocalDateTime parseToLocalDateTime(String value) {
		try {
			return LocalDateTime.parse(value);
		} catch (DateTimeParseException ignored) {
			return LocalDate.parse(value).atStartOfDay();
		}
	}

	private record DailyPriceCandidate(
		Integer matchedPrice,
		LocalDate bestMatchDate,
		LocalDateTime collectedAt
	) {
	}

	public record AlertCandidate(
		AlertType alertType,
		Integer matchedPrice,
		LocalDate nearestMatchDate,
		LocalDate bestPriceDate,
		Integer matchedDateCount,
		LocalDateTime collectedAt
	) {
	}
}
