package com.example.dahaeng.domain.livingcost.dto.request;



import com.example.dahaeng.domain.country.enums.Continent;
import com.example.dahaeng.domain.livingcost.enums.Mode;
import com.example.dahaeng.domain.livingcost.enums.SortDirection;
import com.example.dahaeng.domain.livingcost.enums.TargetType;

public record LivingCostCardRequest(
	Mode mode,
	SortDirection sort,
	TargetType type,
	String keyword
) {
}
