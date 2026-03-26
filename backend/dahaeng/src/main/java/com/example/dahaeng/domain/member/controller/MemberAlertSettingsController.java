package com.example.dahaeng.domain.member.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.member.dto.request.UpdateAlertSettingsRequest;
import com.example.dahaeng.domain.member.dto.response.AlertSettingsResponse;
import com.example.dahaeng.domain.member.service.MemberService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/members/me/alert-settings")
public class MemberAlertSettingsController {

	private final MemberService memberService;

	@GetMapping
	public ResponseEntity<AlertSettingsResponse> getAlertSettings(
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(memberService.getAlertSettings(user.getId()));
	}

	@PatchMapping
	public ResponseEntity<AlertSettingsResponse> updateAlertSettings(
		@AuthenticationPrincipal CustomOAuth2User user,
		@RequestBody @Valid UpdateAlertSettingsRequest request
	) {
		return ResponseEntity.ok(memberService.updateAlertSettings(user.getId(), request));
	}
}
