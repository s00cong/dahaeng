package com.example.dahaeng.domain.exchange.dto.response.current;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;

public record ExchangeRateResponse(
	Currency target,
	LocalDate eventDate,
	BigDecimal rate1krwToTarget,
	Double krwPer1target,
	Integer displayUnit,
	String displaySymbol,
	Double krwPerDisplayUnit,
	LocalDateTime updatedAt
) {
	public static ExchangeRateResponse from(Exchange exchange) {
		return new ExchangeRateResponse(
			exchange.getCurrency(),
			exchange.getEventDate(),
			new BigDecimal(exchange.getRate1krwToCur()),
			exchange.getKrwPer1cur(),
			exchange.getDisplayUnit(),
			exchange.getDisplaySymbol(),
			exchange.getKrwPerDisplayUnit(),
			exchange.getUpdatedAt()
		);
	}
}
