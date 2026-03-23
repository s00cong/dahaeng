package com.example.dahaeng.domain.bookmark.dto.response;

import java.time.LocalDateTime;

import com.example.dahaeng.domain.exchange.dto.response.current.ExchangeRateResponse;
import com.fasterxml.jackson.databind.JsonNode;

public record BookmarkDetailResponse(
	Long id,
	String title,
	JsonNode json,
	ExchangeRateResponse currentExchange,
	LocalDateTime savedAt
) {
}
