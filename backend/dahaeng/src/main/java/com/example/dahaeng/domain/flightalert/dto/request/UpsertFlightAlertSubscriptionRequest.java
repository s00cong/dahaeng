package com.example.dahaeng.domain.flightalert.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpsertFlightAlertSubscriptionRequest(
	@NotNull
	@Min(1)
	Integer thresholdPrice
) {
}
