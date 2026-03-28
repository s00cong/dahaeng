package com.example.dahaeng.domain.place.dto.response;

import java.util.List;

import com.example.dahaeng.domain.place.entity.TouristSpot;

public record PlaceDetailResponse(
	Long id,
	String name,
	String koName,
	String ImageUrl,
	String description,
	String address,
	String socialUrl,
	String websiteUrl,
	List<SpotTagResponse> tags
) {
	public static PlaceDetailResponse from(TouristSpot spot, List<SpotTagResponse> tags) {
		return new PlaceDetailResponse(
			spot.getId(),
			spot.getTouristName(),
			spot.getTouristNameKo(),
			spot.getImageUrl(),
			spot.getDescription(),
			spot.getAddress(),
			spot.getSns(),
			spot.getWebsite(),
			tags
		);
	}
}
