package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import com.example.dahaeng.domain.recommend.repository.SpotRecommendationProjection;

import java.util.List;
import java.util.Map;

public interface PlaceEnrichmentService {
    RecommendCitiesResponse.RecommendedPlace enrich(
            SpotRecommendationProjection spot,
            List<String> selectedTags,
            Map<String, Double> tagScores
    );
}
