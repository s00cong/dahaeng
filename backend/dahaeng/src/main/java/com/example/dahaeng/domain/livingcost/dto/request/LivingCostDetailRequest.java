package com.example.dahaeng.domain.livingcost.dto.request;

import com.example.dahaeng.domain.livingcost.enums.TargetType;

import lombok.Getter;
import lombok.Setter;

public record LivingCostDetailRequest (
	TargetType targetType,
	Long targetId
) {
}
