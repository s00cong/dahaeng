package com.example.dahaeng.domain.flightalert.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.example.dahaeng.domain.flightalert.entity.AlertType;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;

public record FlightAlertNotificationResponse(
	Long notificationId,
	Long cityId,
	String cityName,
	AlertType alertType,
	Integer thresholdPrice,
	Integer matchedPrice,
	LocalDate nearestMatchDate,
	LocalDate bestPriceDate,
	Integer matchedDateCount,
	LocalDateTime collectedAt,
	boolean isRead,
	LocalDateTime createdAt
) {
	public static FlightAlertNotificationResponse from(FlightAlertNotification notification) {
		return new FlightAlertNotificationResponse(
			notification.getId(),
			notification.getSubscription().getCity().getId(),
			notification.getSubscription().getCity().getCityName(),
			notification.getAlertType(),
			notification.getThresholdPrice(),
			notification.getMatchedPrice(),
			notification.getNearestMatchDate(),
			notification.getBestPriceDate(),
			notification.getMatchedDateCount(),
			notification.getCollectedAt(),
			notification.isRead(),
			notification.getCreatedAt()
		);
	}
}
