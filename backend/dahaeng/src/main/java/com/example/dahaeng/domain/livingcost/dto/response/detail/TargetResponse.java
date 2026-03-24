package com.example.dahaeng.domain.livingcost.dto.response.detail;

import com.example.dahaeng.domain.exchange.enums.Currency;

public record TargetResponse(
	Long id,
	String name,
	String parentRegion,
	Currency currency,
	String imgUrl
) {
}