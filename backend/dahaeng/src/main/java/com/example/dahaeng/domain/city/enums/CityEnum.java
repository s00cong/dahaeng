package com.example.dahaeng.domain.city.enums;

import lombok.Getter;

@Getter
public enum CityEnum {
	SEOUL("seoul"),
	SINGAPORE("singapore");

	private final String cityName;

	CityEnum(String cityName) {
		this.cityName = cityName;
	}
}
