package com.example.dahaeng.domain.livingcost.dto.response.compare;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CostVsBaseResponse(
	String currency,
	Integer baseDailyBudget,
	Integer targetDailyBudget,
	Integer dailyBudgetGap,
	Double dailyBudgetGapPercent
) {
}
