package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;

import java.util.List;

public interface RecommendationNarrationService {
    String generateReason(
            CityRankResult city,
            List<RecommendCitiesResponse.RecommendedPlace> places,
            List<String> selectedTags,
            String newsSummary
    );
}
