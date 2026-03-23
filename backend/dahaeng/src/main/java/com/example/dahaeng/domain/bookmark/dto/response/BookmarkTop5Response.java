package com.example.dahaeng.domain.bookmark.dto.response;

import java.time.LocalDateTime;

import com.fasterxml.jackson.databind.JsonNode;

public record BookmarkTop5Response(
	Long id,
	Long cityId,
	Long count,
	JsonNode json,
	LocalDateTime createdAt
) {
}
