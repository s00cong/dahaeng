package com.example.dahaeng.domain.flightalert.event;

import java.time.LocalDate;

public record FlightAlertCreatedEvent(
	Long memberId,
	String email,
	String cityName,
	Integer thresholdPrice,
	Integer matchedPrice,
	LocalDate nearestMatchDate,
	LocalDate bestPriceDate,
	Integer matchedDateCount
) {
}
