package com.example.dahaeng.domain.member.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateAlertSettingsRequest(
	@NotNull Boolean emailAlertEnabled
) {
}
