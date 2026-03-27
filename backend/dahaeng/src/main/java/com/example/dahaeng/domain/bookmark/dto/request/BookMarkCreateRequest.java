package com.example.dahaeng.domain.bookmark.dto.request;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record BookMarkCreateRequest(
	@NotNull Long cityId,
	@NotNull UUID recommendId,
	// @NotNull LocalDateTime createdAt,
	@NotNull Object json
) {
}
