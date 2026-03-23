package com.example.dahaeng.domain.bookmark.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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
import com.example.dahaeng.domain.bookmark.dto.request.BookMarkCreateRequest;
import com.example.dahaeng.domain.bookmark.dto.response.BookmarkDetailResponse;
import com.example.dahaeng.domain.bookmark.dto.response.BookmarkSummaryResponse;
import com.example.dahaeng.domain.bookmark.dto.response.BookmarkTop5Response;
import com.example.dahaeng.domain.bookmark.service.BookmarkService;
import com.example.dahaeng.global.dto.response.NoContentResponse;
import com.example.dahaeng.global.dto.response.PageResponse;
import com.fasterxml.jackson.core.JsonProcessingException;

import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/bookmarks")
@Slf4j
public class BookmarkController {
	private final BookmarkService bookmarkService;

	@GetMapping("/{bookmarkId}")
	public ResponseEntity<BookmarkDetailResponse> detail(
		@PathVariable("bookmarkId") Long bookmarkId,
		@AuthenticationPrincipal CustomOAuth2User user
	) throws JsonProcessingException {
		return ResponseEntity.ok(bookmarkService.detail(bookmarkId, user.getId()));
	}

	@GetMapping
	public ResponseEntity<PageResponse<BookmarkSummaryResponse>> summaries(
		@RequestParam(value = "keyword", required = false) @Nullable String keyword,
		@PageableDefault(page = 0, size = 10, sort = "id", direction = Sort.Direction.DESC)
		Pageable pageable,
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(bookmarkService.summaries(keyword, user.getId(), pageable));
	}

	@PostMapping
	public ResponseEntity<NoContentResponse> save(
		@RequestBody @Valid BookMarkCreateRequest request,
		@AuthenticationPrincipal CustomOAuth2User user
	) throws JsonProcessingException {
		return new ResponseEntity<>(
			bookmarkService.save(request, user.getId()),
			HttpStatus.CREATED
		);
	}

	@DeleteMapping("/{bookmarkId}")
	public ResponseEntity<NoContentResponse> delete(
		@PathVariable("bookmarkId") Long id,
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(bookmarkService.delete(id, user.getId()));
	}

	@GetMapping("/tops")
	public ResponseEntity<List<BookmarkTop5Response>> top5(
		@AuthenticationPrincipal CustomOAuth2User user
	) {
		return ResponseEntity.ok(bookmarkService.top5(user.getId()));
	}
}
