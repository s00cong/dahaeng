package com.example.dahaeng.domain.recommend.dto.request;

import java.util.List;
import java.util.UUID;

public record RecommendCitiesRequest(
        List<String> selectedTags,
        Double userDailyBudget,
        Integer travelDays,
        Integer month,
        UUID recommendId
) {
}
