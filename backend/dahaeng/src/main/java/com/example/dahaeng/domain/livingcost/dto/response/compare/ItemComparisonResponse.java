package com.example.dahaeng.domain.livingcost.dto.response.compare;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ItemComparisonResponse(
	String currency,
	String base,
	String target,
	List<ItemComparisonDetailResponse> items
) {
}
