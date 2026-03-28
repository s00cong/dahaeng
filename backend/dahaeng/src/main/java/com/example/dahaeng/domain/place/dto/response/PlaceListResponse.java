package com.example.dahaeng.domain.place.dto.response;

import java.math.BigDecimal;
import java.util.List;

import com.example.dahaeng.domain.place.entity.TouristSpot;

public record PlaceListResponse(
	Long id,
	String name,
	String koName,
	String address,
	String socialUrl,
	String websiteUrl,
	BigDecimal lat,
	BigDecimal lon,
	List<SpotTagResponse> tags
) {
	public static PlaceListResponse from(TouristSpot spot, List<SpotTagResponse> tags) {
		return new PlaceListResponse(
			spot.getId(),
			spot.getTouristName(),
			spot.getTouristNameKo(),
			spot.getAddress(),
			spot.getSns(),
			spot.getWebsite(),
			new BigDecimal(spot.getLat()),
			new BigDecimal(spot.getLon()),
			tags
		);
	}
}
