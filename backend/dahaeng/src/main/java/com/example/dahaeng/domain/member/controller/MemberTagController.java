package com.example.dahaeng.domain.member.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.member.dto.request.MemberTagCreateRequest;
import com.example.dahaeng.domain.member.dto.response.MemberTagListResponse;
import com.example.dahaeng.domain.member.service.MemberTagService;
import com.example.dahaeng.global.dto.response.NoContentResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/member/tag")
public class MemberTagController {

	private final MemberTagService memberTagService;

	@GetMapping
	public ResponseEntity<List<MemberTagListResponse>> list(
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(memberTagService.list(user.getId()));
	}

	@PostMapping
	public ResponseEntity<?> save(
		@RequestBody MemberTagCreateRequest request,
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		memberTagService.save(request, user.getId());
		return ResponseEntity.ok(new NoContentResponse("태깅이 되었습니다.", null));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<NoContentResponse> delete(
		@PathVariable("id") Long id,
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		memberTagService.delete(id, user.getId());
		return ResponseEntity.ok(new NoContentResponse("태깅이 삭제되었습니다.", id));
	}
}
