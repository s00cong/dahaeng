package com.example.dahaeng.domain.exchange.dto.response.history;

import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.enums.HistoryType;

import java.util.List;

public record ExchangeRateHistoryResponse(
	Currency baseCurrency,
	Currency targetCurrency,
	HistoryType type,
	ExchangeRateLatestResponse latest,
	List<ExchangeRateHistoryItemResponse> history
) {
	public static ExchangeRateHistoryResponse from(
		Currency baseCurrency,
		Currency targetCurrency,
		HistoryType type,
		Exchange latest,
		List<ExchangeRateHistoryItemResponse> history
	) {
		return new ExchangeRateHistoryResponse(
			baseCurrency,
			targetCurrency,
			type,
			ExchangeRateLatestResponse.from(latest),
			history
		);
	}
}
