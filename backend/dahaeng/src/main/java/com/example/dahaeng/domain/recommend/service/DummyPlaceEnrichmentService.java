package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import com.example.dahaeng.domain.recommend.repository.SpotRecommendationProjection;

import java.util.List;
import java.util.Map;

public class DummyPlaceEnrichmentService implements PlaceEnrichmentService {
    @Override
    public RecommendCitiesResponse.RecommendedPlace enrich(
            SpotRecommendationProjection spot,
            List<String> selectedTags,
            Map<String, Double> tagScores
    ) {
        return new RecommendCitiesResponse.RecommendedPlace(
                spot.getPlaceName(),
                spot.getPlaceNameKo(),
                selectedTags,
                tagScores,
                spot.getAddress(),
                spot.getWebsiteUrl(),
                spot.getSocialUrl(),
                new RecommendCitiesResponse.Location(spot.getLat(), spot.getLon())
        );
    }
}
