package com.example.dahaeng.domain.exchange.dto.request;

import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.enums.HistoryType;

public record ExchangeHistoryRequest (
	Currency targetCurrency,
	HistoryType type
) {
}
