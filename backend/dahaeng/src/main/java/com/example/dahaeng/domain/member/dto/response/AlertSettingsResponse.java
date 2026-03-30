package com.example.dahaeng.domain.member.dto.response;

import com.example.dahaeng.domain.member.entity.Member;

public record AlertSettingsResponse(
	boolean emailAlertEnabled
) {
	public static AlertSettingsResponse from(Member member) {
		return new AlertSettingsResponse(member.isEmailAlertEnabled());
	}
}
