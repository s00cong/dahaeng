package com.example.dahaeng.domain.livingcost.dto.response.compare;

public record LocalCostCompareResponse(
	String currency,
	Integer baseLocalDailyCost,
	Integer targetLocalDailyCost,
	Integer localDailyCostGap,
	Double localDailyCostGapPercent
) {
}
