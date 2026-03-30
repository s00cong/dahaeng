package com.example.dahaeng.domain.flightalert.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.flightalert.entity.AlertType;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.member.entity.Member;

class FlightAlertNotificationResponseTest {

	@Test
	void fromUsesSubscriptionCityInfoAndSummaryFields() {
		FlightAlertSubscription subscription = FlightAlertSubscription.builder()
			.id(12L)
			.member(Member.builder()
				.id(1L)
				.email("test@example.com")
				.nickname("tester")
				.role("ROLE_USER")
				.socialId("social-id")
				.build())
			.city(City.builder()
				.id(10L)
				.cityName("Tokyo")
				.country(Country.builder().id(2L).countryName("Japan").build())
				.build())
			.thresholdPrice(350_000)
			.enabled(true)
			.build();

		FlightAlertNotification notification = FlightAlertNotification.builder()
			.id(33L)
			.subscription(subscription)
			.alertType(AlertType.TARGET_HIT)
			.thresholdPrice(350_000)
			.matchedPrice(328_000)
			.nearestMatchDate(LocalDate.parse("2026-04-12"))
			.bestPriceDate(LocalDate.parse("2026-05-14"))
			.matchedDateCount(3)
			.collectedAt(LocalDateTime.parse("2026-03-23T00:00:00"))
			.build();

		FlightAlertNotificationResponse response = FlightAlertNotificationResponse.from(notification);

		assertThat(response.cityId()).isEqualTo(10L);
		assertThat(response.cityName()).isEqualTo("Tokyo");
		assertThat(response.nearestMatchDate()).isEqualTo(LocalDate.parse("2026-04-12"));
		assertThat(response.bestPriceDate()).isEqualTo(LocalDate.parse("2026-05-14"));
		assertThat(response.matchedDateCount()).isEqualTo(3);
		assertThat(response.collectedAt()).isEqualTo(LocalDateTime.parse("2026-03-23T00:00:00"));
	}
}
