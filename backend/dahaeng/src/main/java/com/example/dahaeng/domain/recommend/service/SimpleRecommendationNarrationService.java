package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;

import java.util.List;

public class SimpleRecommendationNarrationService implements RecommendationNarrationService {
    @Override
    public String generateReason(
            CityRankResult city,
            List<RecommendCitiesResponse.RecommendedPlace> places,
            List<String> selectedTags,
            String newsSummary
    ) {
        return "사용자 태그와 예산, 안전도, 관광지 매칭 결과를 종합했을 때 적합도가 높아 추천된 도시입니다.";
    }
}
