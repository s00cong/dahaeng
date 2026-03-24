package com.example.dahaeng.domain.flightalert.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;

public interface FlightAlertNotificationRepository extends JpaRepository<FlightAlertNotification, Long> {
	Page<FlightAlertNotification> findAllBySubscriptionMemberIdAndIsDeletedFalse(Long memberId, Pageable pageable);

	long countBySubscriptionMemberIdAndIsReadFalseAndIsDeletedFalse(Long memberId);

	Optional<FlightAlertNotification> findFirstByIdAndSubscriptionMemberIdAndIsDeletedFalse(Long id, Long memberId);
}
