package com.example.dahaeng.domain.recommend.dto.response;

import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;

import java.util.List;

public record RecommendCitySummaryResponse(
        RequestContext requestContext,
        List<RecommendationItem> recommendations
) {
    public static RecommendCitySummaryResponse of(RecommendCitiesRequest request, List<RecommendationItem> recommendations) {
        return new RecommendCitySummaryResponse(
                new RequestContext(
                        request.selectedTags(),
                        request.userDailyBudget(),
                        request.travelDays(),
                        request.month()
                ),
                recommendations
        );
    }

    public record RequestContext(
            List<String> selectedTags,
            Double userDailyBudget,
            Integer travelDays,
            Integer month
    ) {
    }

    public record RecommendationItem(
            Long id,
            String name,
            String imgUrl,
            Double expectedBudgetFor1day,
            Scores scores,
            CountryDangerResponse danger,
            Double lat,
            Double lon
    ) {
    }

    public record Scores(
            Double total,
            Double tag,
            Double budget,
            Double safety,
            Double newsPenalty
    ) {
    }
}
