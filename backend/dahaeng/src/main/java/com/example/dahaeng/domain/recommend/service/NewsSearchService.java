package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;

public interface NewsSearchService {
    RecommendCitiesResponse.NewsInsight searchAndSummarize(String city, String country, double newPenaltyScore);
}
