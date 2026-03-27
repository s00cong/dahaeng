package com.example.dahaeng.domain.city.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.city.dto.response.CityViewHistoryResponse;
import com.example.dahaeng.domain.city.dto.response.ViewSaveResponse;
import com.example.dahaeng.domain.city.service.CityViewService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/city/view-history")
public class CityViewController {

	private final CityViewService cityViewService;

	@GetMapping
	public ResponseEntity<List<CityViewHistoryResponse>> history(
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(cityViewService.history(user.getId()));
	}

	/**
	 * 실험용 api
	 * 조회 증가 api
	 */
	@PostMapping("/{cityId}")
	public ResponseEntity<?> view(
		@PathVariable("cityId") Long cityId,
		@AuthenticationPrincipal CustomOAuth2User user
		) {
		cityViewService.view(cityId, user.getId());
		return ResponseEntity.ok(new ViewSaveResponse(cityId, "뷰 기록이 저장되었습니다."));
	}
}
