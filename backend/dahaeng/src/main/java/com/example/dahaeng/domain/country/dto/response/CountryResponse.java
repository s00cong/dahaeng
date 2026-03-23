package com.example.dahaeng.domain.country.dto.response;

import java.math.BigDecimal;

import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.country.enums.Continent;
import com.example.dahaeng.domain.exchange.enums.Currency;

public record CountryResponse(
	Long id,
	String countryName,
	Currency currency,
	Continent continent,
	String imgUrl,
	BigDecimal lat,
	BigDecimal lon
) {
	public static CountryResponse from(Country country) {
		return new CountryResponse(
			country.getId(),
			country.getCountryName(),
			country.getCurrency(),
			country.getContinent(),
			country.getImgUrl(),
			country.getLat() != null ? new BigDecimal(country.getLat()) : null,
			country.getLon() != null ? new BigDecimal(country.getLon()) : null
		);
	}
}
