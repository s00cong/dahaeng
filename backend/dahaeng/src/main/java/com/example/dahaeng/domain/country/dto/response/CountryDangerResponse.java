package com.example.dahaeng.domain.country.dto.response;

import java.util.List;

public record CountryDangerResponse(
	String countryName,
	List<CountryDanger> items
) {
}
