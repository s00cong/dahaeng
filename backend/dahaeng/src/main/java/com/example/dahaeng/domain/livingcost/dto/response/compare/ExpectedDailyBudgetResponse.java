package com.example.dahaeng.domain.livingcost.dto.response.compare;

import java.util.List;

public record ExpectedDailyBudgetResponse(
	String currency,
	Integer total,
	BreakdownResponse breakdown,
	List<String> calculationNotes
) {
}