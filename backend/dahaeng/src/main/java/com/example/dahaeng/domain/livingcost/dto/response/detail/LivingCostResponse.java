package com.example.dahaeng.domain.livingcost.dto.response.detail;

import java.time.LocalDateTime;

public record LivingCostResponse(
	Long id,
	Integer dailyBudget,
	Integer withoutRent,
	Integer food,
	Integer transport,
	Integer monthlySalaryAfterTax,
	Double population,
	EatingOutResponse eatingOut,
	TransportationResponse transportation,
	GroceriesResponse groceries,
	OtherResponse other,
	LocalDateTime createdAt,
	LocalDateTime updatedAt
) {
}

