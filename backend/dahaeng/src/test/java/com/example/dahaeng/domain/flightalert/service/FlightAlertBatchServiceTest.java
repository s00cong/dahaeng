package com.example.dahaeng.domain.flightalert.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.flightalert.entity.AlertType;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.event.FlightAlertCreatedEvent;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertNotificationRepository;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;
import com.example.dahaeng.domain.member.entity.Member;

@ExtendWith(MockitoExtension.class)
class FlightAlertBatchServiceTest {

	@Mock
	private FlightAlertSubscriptionRepository subscriptionRepository;

	@Mock
	private FlightAlertNotificationRepository notificationRepository;

	@Mock
	private FlightAlertPriceService priceService;

	@Mock
	private ApplicationEventPublisher applicationEventPublisher;

	@InjectMocks
	private FlightAlertBatchService batchService;

	@Test
	void evaluateActiveSubscriptionsCreatesNotificationAndPublishesEmailEvent() {
		FlightAlertSubscription subscription = subscription(350_000, null, true);
		when(subscriptionRepository.findAllByEnabledTrueAndIsDeletedFalse()).thenReturn(List.of(subscription));
		when(priceService.findAlertCandidate(10L, 350_000)).thenReturn(Optional.of(
			new FlightAlertPriceService.AlertCandidate(
				AlertType.NEAR_TARGET,
				360_000,
				LocalDate.parse("2026-04-12"),
				LocalDate.parse("2026-05-14"),
				2,
				LocalDateTime.parse("2026-03-23T00:00:00")
			)
		));
		when(notificationRepository.save(any(FlightAlertNotification.class))).thenAnswer(invocation -> invocation.getArgument(0));

		batchService.evaluateActiveSubscriptions();

		ArgumentCaptor<FlightAlertNotification> notificationCaptor = ArgumentCaptor.forClass(FlightAlertNotification.class);
		verify(notificationRepository).save(notificationCaptor.capture());
		assertThat(notificationCaptor.getValue().getAlertType()).isEqualTo(AlertType.NEAR_TARGET);
		assertThat(notificationCaptor.getValue().getNearestMatchDate()).isEqualTo(LocalDate.parse("2026-04-12"));
		assertThat(notificationCaptor.getValue().getBestPriceDate()).isEqualTo(LocalDate.parse("2026-05-14"));
		assertThat(notificationCaptor.getValue().getMatchedDateCount()).isEqualTo(2);
		assertThat(subscription.getLastNotifiedPrice()).isEqualTo(360_000);

		ArgumentCaptor<FlightAlertCreatedEvent> eventCaptor = ArgumentCaptor.forClass(FlightAlertCreatedEvent.class);
		verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
		assertThat(eventCaptor.getValue().email()).isEqualTo("test@example.com");
		assertThat(eventCaptor.getValue().cityName()).isEqualTo("Tokyo");
	}

	@Test
	void evaluateActiveSubscriptionsSkipsSamePriceDuplicate() {
		FlightAlertSubscription subscription = subscription(350_000, 360_000, true);
		when(subscriptionRepository.findAllByEnabledTrueAndIsDeletedFalse()).thenReturn(List.of(subscription));
		when(priceService.findAlertCandidate(10L, 350_000)).thenReturn(Optional.of(
			new FlightAlertPriceService.AlertCandidate(
				AlertType.NEAR_TARGET,
				360_000,
				LocalDate.parse("2026-04-12"),
				LocalDate.parse("2026-05-14"),
				2,
				LocalDateTime.parse("2026-03-23T00:00:00")
			)
		));

		batchService.evaluateActiveSubscriptions();

		verify(notificationRepository, never()).save(any());
		verify(applicationEventPublisher, never()).publishEvent(any());
	}

	@Test
	void evaluateActiveSubscriptionsDoesNotPublishEmailEventWhenDisabled() {
		FlightAlertSubscription subscription = subscription(350_000, null, false);
		when(subscriptionRepository.findAllByEnabledTrueAndIsDeletedFalse()).thenReturn(List.of(subscription));
		when(priceService.findAlertCandidate(10L, 350_000)).thenReturn(Optional.of(
			new FlightAlertPriceService.AlertCandidate(
				AlertType.TARGET_HIT,
				328_000,
				LocalDate.parse("2026-04-12"),
				LocalDate.parse("2026-05-14"),
				3,
				LocalDateTime.parse("2026-03-23T00:00:00")
			)
		));
		when(notificationRepository.save(any(FlightAlertNotification.class))).thenAnswer(invocation -> invocation.getArgument(0));

		batchService.evaluateActiveSubscriptions();

		verify(notificationRepository).save(any());
		verify(applicationEventPublisher, never()).publishEvent(any());
	}

	private static FlightAlertSubscription subscription(Integer thresholdPrice, Integer lastNotifiedPrice,
		boolean emailAlertEnabled) {
		return FlightAlertSubscription.builder()
			.member(Member.builder()
				.id(1L)
				.email("test@example.com")
				.nickname("tester")
				.role("ROLE_USER")
				.socialId("social-id")
				.emailAlertEnabled(emailAlertEnabled)
				.build())
			.city(City.builder()
				.id(10L)
				.cityName("Tokyo")
				.country(Country.builder().id(2L).countryName("Japan").build())
				.build())
			.thresholdPrice(thresholdPrice)
			.enabled(true)
			.lastNotifiedPrice(lastNotifiedPrice)
			.build();
	}
}
