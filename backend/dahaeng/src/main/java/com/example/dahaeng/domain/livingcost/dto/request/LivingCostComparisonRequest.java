package com.example.dahaeng.domain.livingcost.dto.request;

import com.example.dahaeng.domain.livingcost.enums.TargetType;

public record LivingCostComparisonRequest(
	TargetType targetType,
	Long baseId,
	Long targetId
){
}
