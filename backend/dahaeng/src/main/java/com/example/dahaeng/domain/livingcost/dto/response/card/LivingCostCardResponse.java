package com.example.dahaeng.domain.livingcost.dto.response.card;

import java.util.List;

import com.example.dahaeng.domain.livingcost.enums.Mode;

public record LivingCostCardResponse(
	Mode mode,
	Object cards
) {
}
