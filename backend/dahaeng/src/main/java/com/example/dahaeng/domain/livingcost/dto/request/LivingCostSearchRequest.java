package com.example.dahaeng.domain.livingcost.dto.request;

import com.example.dahaeng.domain.livingcost.enums.TargetType;

public record LivingCostSearchRequest(
	TargetType type,
	String keyword
) {
}
