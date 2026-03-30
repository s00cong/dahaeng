package com.example.dahaeng.domain.place.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;

import com.example.dahaeng.domain.place.entity.TouristSpot;

class PlaceListResponseTest {

	@Test
	void from_sortsImmutableTagsDescendingAndKeepsAllWhenLessThanFive() {
		TouristSpot spot = TouristSpot.builder()
			.id(1L)
			.touristName("Tower Bridge")
			.touristNameKo("타워 브리지")
			.address("London")
			.sns("https://example.com/social")
			.website("https://example.com")
			.lat(51.5055)
			.lon(-0.0754)
			.build();

		var tags = Stream.of(
			new SpotTagResponse("history", 0.5),
			new SpotTagResponse("night-view", 0.9),
			new SpotTagResponse("photo", 0.7)
		).toList();

		PlaceListResponse response = PlaceListResponse.from(spot, tags);

		assertThat(response.tags())
			.extracting(SpotTagResponse::tagName)
			.containsExactly("night-view", "photo", "history");
	}
}
