package com.example.dahaeng.domain.place.dto.response;

import java.math.BigDecimal;
import java.util.ArrayList;
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
		List<SpotTagResponse> sortedTags = new ArrayList<>(tags);
		sortedTags.sort((o1, o2) -> Double.compare(o2.score(), o1.score()));

		return new PlaceListResponse(
			spot.getId(),
			spot.getTouristName(),
			spot.getTouristNameKo(),
			spot.getAddress(),
			spot.getSns(),
			spot.getWebsite(),
			new BigDecimal(spot.getLat()),
			new BigDecimal(spot.getLon()),
			getTagRes(sortedTags)
		);
	}

	private static List<SpotTagResponse> getTagRes(List<SpotTagResponse> tags) {
		int cnt = 0;
		List<SpotTagResponse> res = new ArrayList<>();
		for (SpotTagResponse tag : tags) {
			if (tag.score() == 0 || cnt >= 5) {
				continue;
			}
			res.add(tag);
			cnt++;
		}
		return res;
	}
}
