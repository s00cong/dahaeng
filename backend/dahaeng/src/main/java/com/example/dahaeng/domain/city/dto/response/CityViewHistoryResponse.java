package com.example.dahaeng.domain.city.dto.response;

import java.time.LocalDateTime;

import com.example.dahaeng.domain.city.entity.City;

public record CityViewHistoryResponse(
	Long cityId,
	String cityName,
	String countryName,
	Integer dailyBudget,
	String imgUrl,
	LocalDateTime lastViewTime
) {
	public static CityViewHistoryResponse from(
		City city,
		Integer dailyBudget,
		LocalDateTime updateAt
	) {
		return new CityViewHistoryResponse(
			city.getId(),
			city.getCityName(),
			city.getCountry().getCountryName(),
			dailyBudget,
			city.getImgUrl(),
			updateAt
		);
	}
}
