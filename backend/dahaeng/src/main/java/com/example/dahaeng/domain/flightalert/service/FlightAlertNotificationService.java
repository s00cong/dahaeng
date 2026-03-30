package com.example.dahaeng.domain.flightalert.service;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.flightalert.dto.response.FlightAlertNotificationResponse;
import com.example.dahaeng.domain.flightalert.dto.response.UnreadFlightAlertCountResponse;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertNotificationRepository;
import com.example.dahaeng.global.dto.response.NoContentResponse;
import com.example.dahaeng.global.dto.response.PageResponse;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class FlightAlertNotificationService {
	private final FlightAlertNotificationRepository notificationRepository;

	@Transactional(readOnly = true)
	public PageResponse<FlightAlertNotificationResponse> getNotifications(Long memberId, Pageable pageable) {
		return PageResponse.from(
			notificationRepository.findAllBySubscriptionMemberIdAndIsDeletedFalse(memberId, pageable)
				.map(FlightAlertNotificationResponse::from)
		);
	}

	@Transactional(readOnly = true)
	public UnreadFlightAlertCountResponse getUnreadCount(Long memberId) {
		return new UnreadFlightAlertCountResponse(
			notificationRepository.countBySubscriptionMemberIdAndIsReadFalseAndIsDeletedFalse(memberId)
		);
	}

	public NoContentResponse markAsRead(Long memberId, Long notificationId) {
		FlightAlertNotification notification = notificationRepository
			.findFirstByIdAndSubscriptionMemberIdAndIsDeletedFalse(notificationId, memberId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "항공권 알림을 찾을 수 없습니다."));
		notification.markAsRead();
		return new NoContentResponse("알림을 읽음 처리했습니다.", notification.getId());
	}
}
