package com.example.dahaeng.domain.flightalert.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.bookmark.repository.BookmarkRepository;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertNotificationRepository;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class FlightAlertBatchService {
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

			priceService.findAlertCandidate(subscription.getCity().getId(), subscription.getThresholdPrice())
				.ifPresent(match -> createNotificationIfNeeded(subscription, match));
		}
	}

	private void createNotificationIfNeeded(
		FlightAlertSubscription subscription,
		FlightAlertPriceService.AlertCandidate match
	) {
		if (subscription.getLastNotifiedPrice() != null && match.matchedPrice() >= subscription.getLastNotifiedPrice()) {
			return;
		}

		notificationRepository.save(FlightAlertNotification.builder()
			.subscription(subscription)
			.alertType(match.alertType())
			.thresholdPrice(subscription.getThresholdPrice())
			.matchedPrice(match.matchedPrice())
			.nearestMatchDate(match.nearestMatchDate())
			.bestPriceDate(match.bestPriceDate())
			.matchedDateCount(match.matchedDateCount())
			.collectedAt(match.collectedAt())
			.build());

		subscription.updateLastNotification(match.matchedPrice(), LocalDateTime.now());
	}
}
