package com.example.dahaeng.domain.place.dto.response;

import java.util.List;

import com.example.dahaeng.domain.place.entity.TouristSpot;

public record PlaceResponse(
	Long id,
	String name,
	String imgUrl,
	List<String> tags
) {
	public static PlaceResponse from(TouristSpot spot, List<String> tags) {
		return new PlaceResponse(
			spot.getId(),
			spot.getTouristName(),
			spot.getImageUrl(),
			tags
		);
	}
}
