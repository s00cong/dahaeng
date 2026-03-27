package com.example.dahaeng.domain.exchange.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.exchange.dto.request.ExchangeHistoryRequest;
import com.example.dahaeng.domain.exchange.dto.response.current.ExchangeRateResponse;
import com.example.dahaeng.domain.exchange.dto.response.history.ExchangeRateHistoryItemResponse;
import com.example.dahaeng.domain.exchange.dto.response.history.ExchangeRateHistoryResponse;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExchangeService {
	private final ExchangeRepository exchangeRepository;
	private final Currency BASE_CURRENCY = Currency.KRW;

	public ExchangeRateResponse getCurrentExchange(Currency currency) {
		Exchange exchange = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(currency)
			.orElseThrow(() -> new CustomException(
				ErrorCode.INVALID_REQUEST, "유효하지 않은 통화입니다."));

		return ExchangeRateResponse.from(exchange);
	}

	public ExchangeRateHistoryResponse getExchangeHistory(ExchangeHistoryRequest request) {
		Exchange latest = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(request.targetCurrency())
			.orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST, "유효하지 않은 통화입니다."));

		return switch (request.type()) {
			case D -> dayExchangeHistory(request, latest);
			case W -> weekExchangeHistory(request, latest);
			case M -> monthExchangeHistory(request, latest);
			default -> throw new CustomException(ErrorCode.INVALID_REQUEST, "잘못된 요청입니다.");
		};
	}

	private ExchangeRateHistoryResponse monthExchangeHistory(ExchangeHistoryRequest request, Exchange latest) {
		LocalDate baseDate = latest.getEventDate();
		LocalDate startDate = baseDate.minusMonths(6).withDayOfMonth(1);

		List<Exchange> exchanges = exchangeRepository.findByCurrencyAndEventDateBetween(
			request.targetCurrency(), startDate, baseDate
		);

		Map<YearMonth, List<Exchange>> grouped = new LinkedHashMap<>();

		for (Exchange exchange : exchanges) {
			YearMonth key = YearMonth.from(exchange.getEventDate());
			grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(exchange);
		}

		return ExchangeRateHistoryResponse.from(
			BASE_CURRENCY,
			request.targetCurrency(),
			request.type(),
			latest,
			grouped.values().stream()
				.map(this::toMonthlyAverageResponse)
				.sorted(Comparator.comparing(ExchangeRateHistoryItemResponse::date))
				.toList()
		);
	}

	private ExchangeRateHistoryResponse weekExchangeHistory(ExchangeHistoryRequest request, Exchange latest) {
		LocalDate baseDate = latest.getEventDate();
		LocalDate startDate = baseDate.minusWeeks(6).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

		List<Exchange> exchanges = exchangeRepository.findByCurrencyAndEventDateBetween(
			request.targetCurrency(), startDate, baseDate
		);

		WeekFields weekFields = WeekFields.of(Locale.KOREA);
		Map<String, List<Exchange>> grouped = new LinkedHashMap<>();

		for (Exchange exchange : exchanges) {
			LocalDate date = exchange.getEventDate();
			int week = date.get(weekFields.weekOfWeekBasedYear());
			int year = date.get(weekFields.weekBasedYear());
			String key = year + "-" + week;

			grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(exchange);
		}

		return ExchangeRateHistoryResponse.from(
			BASE_CURRENCY,
			request.targetCurrency(),
			request.type(),
			latest,
			grouped.values().stream()
				.map(this::toWeeklyAverageResponse)
				.sorted(Comparator.comparing(ExchangeRateHistoryItemResponse::date))
				.toList()
		);

	}

	private ExchangeRateHistoryResponse dayExchangeHistory(ExchangeHistoryRequest request, Exchange latest) {
		LocalDate baseDate = latest.getEventDate();
		LocalDate startDate = baseDate.minusDays(6);

		List<Exchange> exchanges = exchangeRepository
			.findByCurrencyAndEventDateBetween(request.targetCurrency(), startDate, baseDate);

		return ExchangeRateHistoryResponse.from(
			BASE_CURRENCY,
			request.targetCurrency(),
			request.type(),
			latest,
			exchanges.stream()
				.sorted((Comparator.comparing(Exchange::getEventDate)))
				.map(ExchangeRateHistoryItemResponse::from)
				.toList()
		);
	}

	private ExchangeRateHistoryItemResponse toWeeklyAverageResponse(List<Exchange> exchanges) {
		LocalDate representativeDate = exchanges.get(exchanges.size() - 1).getEventDate();

		BigDecimal avgKrwPer1Cur = averageKrwPer1Cur(exchanges);
		BigDecimal avgRate1KrwToTarget = inverse(avgKrwPer1Cur, 6);

		return new ExchangeRateHistoryItemResponse(
			representativeDate,
			avgRate1KrwToTarget,
			avgKrwPer1Cur
		);
	}

	private ExchangeRateHistoryItemResponse toMonthlyAverageResponse(List<Exchange> exchanges) {
		LocalDate representativeDate = exchanges.get(exchanges.size() - 1).getEventDate();

		BigDecimal avgKrwPer1Cur = averageKrwPer1Cur(exchanges);
		BigDecimal avgRate1KrwToTarget = inverse(avgKrwPer1Cur, 6);

		return new ExchangeRateHistoryItemResponse(
			representativeDate,
			avgRate1KrwToTarget,
			avgKrwPer1Cur
		);
	}

	private BigDecimal inverse(BigDecimal value, int scale) {
		if (value == null || BigDecimal.ZERO.compareTo(value) == 0) {
			return BigDecimal.ZERO;
		}
		return BigDecimal.ONE.divide(value, scale, RoundingMode.HALF_UP);
	}

	private BigDecimal averageKrwPer1Cur(List<Exchange> exchanges) {
		BigDecimal sum = exchanges.stream()
			.map(e -> BigDecimal.valueOf(e.getKrwPer1cur()))
			.reduce(BigDecimal.ZERO, BigDecimal::add);

		return sum.divide(
			BigDecimal.valueOf(exchanges.size()),
			6,
			RoundingMode.HALF_UP
		);
	}

}
