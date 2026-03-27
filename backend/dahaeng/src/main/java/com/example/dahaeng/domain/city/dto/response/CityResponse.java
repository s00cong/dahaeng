package com.example.dahaeng.domain.city.dto.response;

import java.math.BigDecimal;

import com.example.dahaeng.domain.city.entity.City;

public record CityResponse(
	Long cityId,
	String cityName,
	Long countryId,
	String countryName,
	String description,
	BigDecimal lat,
	BigDecimal lon
) {
	public static CityResponse from(City city) {
		return new CityResponse(
			city.getId(),
			city.getCityName(),
			city.getCountry().getId(),
			city.getCountry().getCountryName(),
			city.getDescription(),
			city.getLat() != null ? new BigDecimal(city.getLat()) : null,
			city.getLon() != null ? new BigDecimal(city.getLon()) : null
		);
	}
}
