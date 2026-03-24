package com.example.dahaeng.domain.flightalert.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.bookmark.repository.BookmarkRepository;
import com.example.dahaeng.domain.flightalert.entity.AlertType;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertNotificationRepository;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class FlightAlertBatchService {
	private static final double NEAR_TARGET_MULTIPLIER = 1.05d;

	private final FlightAlertSubscriptionRepository subscriptionRepository;
	private final FlightAlertNotificationRepository notificationRepository;
	private final FlightAlertPriceService priceService;
	private final BookmarkRepository bookmarkRepository;

	public void evaluateActiveSubscriptions() {
		for (FlightAlertSubscription subscription : subscriptionRepository.findAllByEnabledTrueAndIsDeletedFalse()) {
			if (!bookmarkRepository.existsByMemberIdAndCityIdAndIsDeletedFalse(
				subscription.getMember().getId(),
				subscription.getCity().getId()
			)) {
				subscription.disable();
				continue;
			}

			priceService.findLowestRoundTrip(subscription.getCity().getId())
				.ifPresent(match -> createNotificationIfNeeded(subscription, match));
		}
	}

	private void createNotificationIfNeeded(
		FlightAlertSubscription subscription,
		FlightAlertPriceService.RoundTripPriceMatch match
	) {
		AlertType alertType = resolveAlertType(subscription.getThresholdPrice(), match.matchedPrice());
		if (alertType == null) {
			return;
		}

		if (subscription.getLastNotifiedPrice() != null && match.matchedPrice() >= subscription.getLastNotifiedPrice()) {
			return;
		}

		notificationRepository.save(FlightAlertNotification.builder()
			.subscription(subscription)
			.member(subscription.getMember())
			.city(subscription.getCity())
			.alertType(alertType)
			.thresholdPrice(subscription.getThresholdPrice())
			.matchedPrice(match.matchedPrice())
			.departureDate(LocalDate.parse(match.departureDate()))
			.returnDate(LocalDate.parse(match.returnDate()))
			.collectedDate(LocalDate.parse(match.collectedDate()))
			.build());

		subscription.updateLastNotification(match.matchedPrice(), LocalDateTime.now());
	}

	AlertType resolveAlertType(Integer thresholdPrice, Integer matchedPrice) {
		if (matchedPrice <= thresholdPrice) {
			return AlertType.TARGET_HIT;
		}
		int nearTargetUpperBound = (int)Math.floor(thresholdPrice * NEAR_TARGET_MULTIPLIER);
		if (matchedPrice <= nearTargetUpperBound) {
			return AlertType.NEAR_TARGET;
		}
		return null;
	}
}
