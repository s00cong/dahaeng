package com.example.dahaeng.domain.flightalert.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.dahaeng.domain.bookmark.repository.BookmarkRepository;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.flightalert.entity.AlertType;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertNotificationRepository;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;
import com.example.dahaeng.domain.member.entity.Member;
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

@ExtendWith(MockitoExtension.class)
class FlightAlertBatchServiceTest {

    @Mock
    private FlightAlertSubscriptionRepository subscriptionRepository;

    @Mock
    private FlightAlertNotificationRepository notificationRepository;

    @Mock
    private FlightAlertPriceService priceService;

    @Mock
    private BookmarkRepository bookmarkRepository;

    @InjectMocks
    private FlightAlertBatchService batchService;

    @Test
    void evaluateActiveSubscriptions_createsNearTargetNotification() {
        FlightAlertSubscription subscription = subscription(350_000, null);
        when(subscriptionRepository.findAllByEnabledTrueAndIsDeletedFalse()).thenReturn(List.of(subscription));
        when(bookmarkRepository.existsByMemberIdAndCityIdAndIsDeletedFalse(1L, 10L)).thenReturn(true);
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

        ArgumentCaptor<FlightAlertNotification> captor = ArgumentCaptor.forClass(FlightAlertNotification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getAlertType()).isEqualTo(AlertType.NEAR_TARGET);
        assertThat(captor.getValue().getNearestMatchDate()).isEqualTo(LocalDate.parse("2026-04-12"));
        assertThat(captor.getValue().getBestPriceDate()).isEqualTo(LocalDate.parse("2026-05-14"));
        assertThat(captor.getValue().getMatchedDateCount()).isEqualTo(2);
        assertThat(subscription.getLastNotifiedPrice()).isEqualTo(360_000);
    }

    @Test
    void evaluateActiveSubscriptions_skipsSamePriceDuplicate() {
        FlightAlertSubscription subscription = subscription(350_000, 360_000);
        when(subscriptionRepository.findAllByEnabledTrueAndIsDeletedFalse()).thenReturn(List.of(subscription));
        when(bookmarkRepository.existsByMemberIdAndCityIdAndIsDeletedFalse(1L, 10L)).thenReturn(true);
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
    }

    @Test
    void evaluateActiveSubscriptions_disablesSubscriptionWithoutBookmarks() {
        FlightAlertSubscription subscription = subscription(350_000, null);
        when(subscriptionRepository.findAllByEnabledTrueAndIsDeletedFalse()).thenReturn(List.of(subscription));
        when(bookmarkRepository.existsByMemberIdAndCityIdAndIsDeletedFalse(1L, 10L)).thenReturn(false);

        batchService.evaluateActiveSubscriptions();

        assertThat(subscription.isEnabled()).isFalse();
        verify(notificationRepository, never()).save(any());
    }

    private static FlightAlertSubscription subscription(Integer thresholdPrice, Integer lastNotifiedPrice) {
        return FlightAlertSubscription.builder()
                .member(Member.builder()
                        .id(1L)
                        .email("test@example.com")
                        .nickname("tester")
                        .role("ROLE_USER")
                        .socialId("social-id")
                        .build())
                .city(City.builder()
                        .id(10L)
                        .cityName("도쿄")
                        .country(Country.builder().id(2L).countryName("일본").build())
                        .build())
                .thresholdPrice(thresholdPrice)
                .enabled(true)
                .lastNotifiedPrice(lastNotifiedPrice)
                .build();
    }
}
