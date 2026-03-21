package com.example.dahaeng.domain.livingcost.dto.response.compare;

public record AffordabilityCompareResponse(
	String currency,
	Integer baseDailyIncome,
	Integer targetDailyIncome,
	Double baseLocalCostBurdenPercent,
	Double targetLocalCostBurdenPercent,
	Double burdenGapPercentPoint,
	Boolean targetMoreAffordable
) {
}
