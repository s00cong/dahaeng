package com.example.dahaeng.domain.bookmark.dto.request;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.validation.constraints.NotNull;

public record BookMarkCreateRequest(
	@NotNull Long cityId,
	// @NotNull LocalDateTime createdAt,
	@NotNull Object json
) {
}
