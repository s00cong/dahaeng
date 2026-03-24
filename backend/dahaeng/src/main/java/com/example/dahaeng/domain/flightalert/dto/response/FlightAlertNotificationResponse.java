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
	LocalDate departureDate,
	LocalDate returnDate,
	LocalDate collectedDate,
	boolean isRead,
	LocalDateTime createdAt
) {
	public static FlightAlertNotificationResponse from(FlightAlertNotification notification) {
		return new FlightAlertNotificationResponse(
			notification.getId(),
			notification.getCity().getId(),
			notification.getCity().getCityName(),
			notification.getAlertType(),
			notification.getThresholdPrice(),
			notification.getMatchedPrice(),
			notification.getDepartureDate(),
			notification.getReturnDate(),
			notification.getCollectedDate(),
			notification.isRead(),
			notification.getCreatedAt()
		);
	}
}
