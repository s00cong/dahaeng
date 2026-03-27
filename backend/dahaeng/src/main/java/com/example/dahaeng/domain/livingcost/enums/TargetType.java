package com.example.dahaeng.domain.livingcost.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum TargetType {
	CONTINENT("continent"),
	COUNTRY("country"),
	CITY("city");

	private final String value;

	TargetType(String value) {
		this.value = value;
	}

	@JsonValue
	public String getValue() {
		return value;
	}
}