package com.example.dahaeng.domain.exchange.dto.response.history;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.example.dahaeng.domain.exchange.entity.Exchange;

public record ExchangeRateHistoryItemResponse(
	LocalDate date,
	BigDecimal rate1krwToTarget,
	BigDecimal krwPer1target
) {
	public static ExchangeRateHistoryItemResponse from(Exchange exchange) {
		return new ExchangeRateHistoryItemResponse(
			exchange.getEventDate(),
			new BigDecimal(exchange.getRate1krwToCur()),
			new BigDecimal(exchange.getKrwPer1cur())
		);
	}
}
