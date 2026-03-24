package com.example.dahaeng.domain.flightalert.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.flightalert.dto.request.UpsertFlightAlertSubscriptionRequest;
import com.example.dahaeng.domain.flightalert.dto.response.FlightAlertNotificationResponse;
import com.example.dahaeng.domain.flightalert.dto.response.FlightAlertSubscriptionResponse;
import com.example.dahaeng.domain.flightalert.dto.response.UnreadFlightAlertCountResponse;
import com.example.dahaeng.domain.flightalert.service.FlightAlertNotificationService;
import com.example.dahaeng.domain.flightalert.service.FlightAlertSubscriptionService;
import com.example.dahaeng.global.dto.response.NoContentResponse;
import com.example.dahaeng.global.dto.response.PageResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/flight-alerts")
public class FlightAlertController {
	private final FlightAlertSubscriptionService subscriptionService;
	private final FlightAlertNotificationService notificationService;

	@GetMapping("/subscriptions")
	public ResponseEntity<List<FlightAlertSubscriptionResponse>> getSubscriptions(
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(subscriptionService.getSubscriptions(user.getId()));
	}

	@PutMapping("/subscriptions/{cityId}")
	public ResponseEntity<FlightAlertSubscriptionResponse> upsertSubscription(
		@PathVariable Long cityId,
		@RequestBody @Valid UpsertFlightAlertSubscriptionRequest request,
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(FlightAlertSubscriptionResponse.from(
			subscriptionService.upsert(user.getId(), cityId, request)
		));
	}

	@DeleteMapping("/subscriptions/{cityId}")
	public ResponseEntity<NoContentResponse> disableSubscription(
		@PathVariable Long cityId,
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(subscriptionService.disable(user.getId(), cityId));
	}

	@GetMapping("/notifications")
	public ResponseEntity<PageResponse<FlightAlertNotificationResponse>> getNotifications(
		@PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC)
		Pageable pageable,
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(notificationService.getNotifications(user.getId(), pageable));
	}

	@GetMapping("/notifications/unread-count")
	public ResponseEntity<UnreadFlightAlertCountResponse> getUnreadCount(
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(notificationService.getUnreadCount(user.getId()));
	}

	@PatchMapping("/notifications/{notificationId}/read")
	public ResponseEntity<NoContentResponse> markAsRead(
		@PathVariable Long notificationId,
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(notificationService.markAsRead(user.getId(), notificationId));
	}
}
