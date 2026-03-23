package com.example.dahaeng.domain.place.dto.response;

import java.util.List;

import com.example.dahaeng.domain.place.entity.TouristSpot;

public record PlaceListResponse(
	Long id,
	String name,
	String address,
	String socialUrl,
	String websiteUrl,
	List<SpotTagResponse> tags
) {
	public static PlaceListResponse from(TouristSpot spot, List<SpotTagResponse> tags) {
		return new PlaceListResponse(
			spot.getId(),
			spot.getTouristName(),
			spot.getAddress(),
			spot.getSns(),
			spot.getWebsite(),
			tags
		);
	}
}
