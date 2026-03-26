package com.example.dahaeng.domain.flightalert.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.flightalert.dto.request.UpsertFlightAlertSubscriptionRequest;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;

@ExtendWith(MockitoExtension.class)
class FlightAlertSubscriptionServiceTest {

	@Mock
	private FlightAlertSubscriptionRepository subscriptionRepository;

	@Mock
	private MemberRepository memberRepository;

	@Mock
	private CityRepository cityRepository;

	@InjectMocks
	private FlightAlertSubscriptionService subscriptionService;

	@Test
	void upsertCreatesSubscriptionFromCityDetailWithoutBookmarkDependency() {
		Member member = member(1L, true);
		City city = city(10L, "Tokyo");

		when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
		when(cityRepository.findById(10L)).thenReturn(Optional.of(city));
		when(subscriptionRepository.findFirstByMemberIdAndCityIdAndIsDeletedFalse(1L, 10L))
			.thenReturn(Optional.empty());
		when(subscriptionRepository.save(any(FlightAlertSubscription.class))).thenAnswer(invocation -> invocation.getArgument(0));

		FlightAlertSubscription saved = subscriptionService.upsert(
			1L,
			10L,
			new UpsertFlightAlertSubscriptionRequest(350_000)
		);

		assertThat(saved.getMember()).isEqualTo(member);
		assertThat(saved.getCity()).isEqualTo(city);
		assertThat(saved.getThresholdPrice()).isEqualTo(350_000);
		assertThat(saved.isEnabled()).isTrue();
	}

	@Test
	void upsertUpdatesExistingSubscriptionInsteadOfCreatingNewOne() {
		Member member = member(1L, true);
		City city = city(10L, "Tokyo");
		FlightAlertSubscription existing = FlightAlertSubscription.builder()
			.member(member)
			.city(city)
			.thresholdPrice(350_000)
			.enabled(false)
			.lastNotifiedPrice(360_000)
			.build();

		when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
		when(cityRepository.findById(10L)).thenReturn(Optional.of(city));
		when(subscriptionRepository.findFirstByMemberIdAndCityIdAndIsDeletedFalse(1L, 10L))
			.thenReturn(Optional.of(existing));
		when(subscriptionRepository.save(any(FlightAlertSubscription.class))).thenAnswer(invocation -> invocation.getArgument(0));

		FlightAlertSubscription saved = subscriptionService.upsert(
			1L,
			10L,
			new UpsertFlightAlertSubscriptionRequest(330_000)
		);

		assertThat(saved.getThresholdPrice()).isEqualTo(330_000);
		assertThat(saved.isEnabled()).isTrue();
		assertThat(saved.getLastNotifiedPrice()).isNull();
	}

	private static Member member(Long id, boolean emailAlertEnabled) {
		return Member.builder()
			.id(id)
			.email("test@example.com")
			.nickname("tester")
			.role("ROLE_USER")
			.socialId("social-id")
			.emailAlertEnabled(emailAlertEnabled)
			.build();
	}

	private static City city(Long id, String name) {
		return City.builder()
			.id(id)
			.cityName(name)
			.country(Country.builder().id(1L).countryName("Japan").build())
			.build();
	}
}
