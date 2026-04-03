package com.example.dahaeng.domain.bookmark.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record BookmarkCreateRequest(
	@NotNull Long cityId,
	@NotNull UUID recommendId,
	@NotNull String title,
	@NotNull Object json
) {
}
