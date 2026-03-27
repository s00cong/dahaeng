package com.example.dahaeng.domain.city.dto.response;

import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;

public record AllCitiesResponse(
		Long id,
        String name,
        String imgUrl,
        Double livingCostFor1Day,
        CountryDangerResponse danger,

        Double lat,
        Double lon
) {
}
