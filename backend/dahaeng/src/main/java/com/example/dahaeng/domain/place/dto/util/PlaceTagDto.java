package com.example.dahaeng.domain.place.dto.util;

import java.util.List;

import com.example.dahaeng.domain.place.entity.TouristSpot;
import com.example.dahaeng.domain.recommend.repository.SpotTagScoreProjection;

public record PlaceTagDto(
	TouristSpot place,
	List<SpotTagScoreProjection> tags
) {
}
