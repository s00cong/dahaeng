package com.example.dahaeng.domain.livingcost.dto.response.compare;

public record ItemComparisonDetailResponse(
	String itemKey,
	String itemName,
	Integer basePrice,
	Integer targetPrice,
	Integer difference,
	Double differencePercent
) {
}