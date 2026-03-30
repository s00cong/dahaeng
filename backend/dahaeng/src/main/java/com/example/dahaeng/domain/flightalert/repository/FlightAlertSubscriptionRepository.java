package com.example.dahaeng.domain.flightalert.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;

public interface FlightAlertSubscriptionRepository extends JpaRepository<FlightAlertSubscription, Long> {
	Optional<FlightAlertSubscription> findFirstByMemberIdAndCityIdAndIsDeletedFalse(Long memberId, Long cityId);

	List<FlightAlertSubscription> findAllByMemberIdAndIsDeletedFalse(Long memberId);

	List<FlightAlertSubscription> findAllByEnabledTrueAndIsDeletedFalse();
}
