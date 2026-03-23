package com.example.dahaeng.domain.flightalert.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.dahaeng.domain.bookmark.repository.BookmarkRepository;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.flightalert.dto.request.UpsertFlightAlertSubscriptionRequest;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.global.exception.CustomException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FlightAlertSubscriptionServiceTest {

    @Mock
    private FlightAlertSubscriptionRepository subscriptionRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private CityRepository cityRepository;

    @Mock
    private BookmarkRepository bookmarkRepository;

    @InjectMocks
    private FlightAlertSubscriptionService subscriptionService;

    @Test
    void upsertRejectsCityWithoutBookmark() {
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member(1L)));
        when(cityRepository.findById(10L)).thenReturn(Optional.of(city(10L, "도쿄")));
        when(bookmarkRepository.existsByMemberIdAndCityIdAndIsDeletedFalse(1L, 10L)).thenReturn(false);

        assertThatThrownBy(() -> subscriptionService.upsert(
                1L,
                10L,
                new UpsertFlightAlertSubscriptionRequest(350_000)
        )).isInstanceOf(CustomException.class);

        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void upsertUpdatesExistingSubscriptionInsteadOfCreatingNewOne() {
        Member member = member(1L);
        City city = city(10L, "도쿄");
        FlightAlertSubscription existing = FlightAlertSubscription.builder()
                .member(member)
                .city(city)
                .thresholdPrice(350_000)
                .enabled(false)
                .lastNotifiedPrice(360_000)
                .build();

        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(cityRepository.findById(10L)).thenReturn(Optional.of(city));
        when(bookmarkRepository.existsByMemberIdAndCityIdAndIsDeletedFalse(1L, 10L)).thenReturn(true);
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

    private static Member member(Long id) {
        return Member.builder()
                .id(id)
                .email("test@example.com")
                .nickname("tester")
                .role("ROLE_USER")
                .socialId("social-id")
                .build();
    }

    private static City city(Long id, String name) {
        return City.builder()
                .id(id)
                .cityName(name)
                .country(Country.builder().id(1L).countryName("일본").build())
                .build();
    }
}
