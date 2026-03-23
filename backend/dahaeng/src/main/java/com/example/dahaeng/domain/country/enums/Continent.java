package com.example.dahaeng.domain.country.enums;

import lombok.Getter;

@Getter
public enum Continent {
	ASIA("asia"),
	EUROPE("europe"),
	NORTH_AMERICA("north america"),
	SOUTH_AMERICA("south america"),
	AFRICA("africa"),
	OCEANIA("oceania");

	private final String value;

	Continent(String value) {
		this.value = value;
	}

	public static Continent match(String value) {
		for (Continent continent : Continent.values()) {
			if (continent.getValue().contains(value.toLowerCase())) {
				return continent;
			}
		}
		return null;
	}
}
