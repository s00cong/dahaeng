package com.example.dahaeng.domain.exchange.dto.response.history;

import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ExchangeRateLatestResponse(
	LocalDate eventDate,
	BigDecimal rate1krwToTarget,
	BigDecimal krwPer1target,
	Integer displayUnit,
	String displaySymbol,
	BigDecimal krwPerDisplayUnit
) {
	public static ExchangeRateLatestResponse from(Exchange exchange) {
		return new ExchangeRateLatestResponse(
			exchange.getEventDate(),
			new BigDecimal(exchange.getRate1krwToCur()),
			new BigDecimal(exchange.getKrwPer1cur()),
			exchange.getDisplayUnit(),
			exchange.getDisplaySymbol(),
			new BigDecimal(exchange.getKrwPerDisplayUnit())
		);
	}
}