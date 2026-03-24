package com.example.dahaeng.domain.country.enums;

import lombok.Getter;

@Getter
public enum DangerLevel {
	ATTENTION("[1단계]"), CONTROL("[2단계]"), LIMIT("[3단계]"), BAN("[4단계]");

	private final String level;

	DangerLevel(String level) {
		this.level = level;
	}
}
