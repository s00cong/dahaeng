package com.example.dahaeng.domain.flightalert.dto.response;

import java.time.LocalDateTime;

import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;

public record FlightAlertSubscriptionResponse(
	Long subscriptionId,
	Long cityId,
	String cityName,
	String countryName,
	Integer thresholdPrice,
	boolean enabled,
	Integer lastNotifiedPrice,
	LocalDateTime lastNotifiedAt
) {
	public static FlightAlertSubscriptionResponse from(FlightAlertSubscription subscription) {
		return new FlightAlertSubscriptionResponse(
			subscription.getId(),
			subscription.getCity().getId(),
			subscription.getCity().getCityName(),
			subscription.getCity().getCountry().getCountryName(),
			subscription.getThresholdPrice(),
			subscription.isEnabled(),
			subscription.getLastNotifiedPrice(),
			subscription.getLastNotifiedAt()
		);
	}
}
