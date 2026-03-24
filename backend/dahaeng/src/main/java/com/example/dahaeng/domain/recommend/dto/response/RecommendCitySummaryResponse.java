package com.example.dahaeng.domain.recommend.dto.response;

import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;

import java.util.List;
import java.util.UUID;

public record RecommendCitySummaryResponse(
        RequestContext requestContext,
        UUID recommendId,
        List<RecommendationItem> recommendations
) {
    public static RecommendCitySummaryResponse of(RecommendCitiesRequest request, List<RecommendationItem> recommendations) {
        return new RecommendCitySummaryResponse(
                new RequestContext(
                        request.selectedTags(),
                        request.userTotalBudget(),
                        request.travelDays(),
                        request.month()
                ),
                request.recommendId(),
                recommendations
        );
    }

    public record RequestContext(
            List<String> selectedTags,
            Double userTotalBudget,
            Integer travelDays,
            Integer month
    ) {
    }

    public record RecommendationItem(
            Long id,
            String name,
            String imgUrl,
            Double livingCostFor1Day,
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
