package com.example.dahaeng.domain.bookmark.dto.util;

import java.time.LocalDateTime;

public record CityLatestBookmarkDto(
	Long cityId,
	Long bookmarkId,
	String json,
	LocalDateTime createdAt
) {
}
