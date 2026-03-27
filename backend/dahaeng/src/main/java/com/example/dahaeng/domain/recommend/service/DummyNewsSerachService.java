package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;

import java.util.List;

public class DummyNewsSerachService implements NewsSearchService {
    @Override
    public RecommendCitiesResponse.NewsInsight searchAndSummarize(String city, String country, double newsPenaltyScore) {
        String summary = newsPenaltyScore <= -8
                ? city + " 관련 최근 뉴스에 부정 이슈가 일부 있어 주의가 필요합니다."
                : city + " 관련 최근 뉴스는 여행과 관광 중심으로 긍정적입니다.";
        return new RecommendCitiesResponse.NewsInsight(
                summary,
                List.of(
                        new RecommendCitiesResponse.Article(city + " travel news 1", "https://example.com/1", null, city + " news description 1", city + " news content 1", null),
                        new RecommendCitiesResponse.Article(city + " travel news 2", "https://example.com/2", null, city + " news description 2", city + " news content 2", null),
                        new RecommendCitiesResponse.Article(city + " travel news 3", "https://example.com/3", null, city + " news description 3", city + " news content 3", null),
                        new RecommendCitiesResponse.Article(city + " travel news 4", "https://example.com/4", null, city + " news description 4", city + " news content 4", null),
                        new RecommendCitiesResponse.Article(city + " travel news 5", "https://example.com/5", null, city + " news description 5", city + " news content 5", null)
                )
        );
    }
}
