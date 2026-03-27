package com.example.dahaeng.domain.livingcost.dto.response.search;

import com.example.dahaeng.domain.livingcost.enums.TargetType;

public record LivingCostSearchedResponse(
	TargetType type,
	Object items
) {
}
