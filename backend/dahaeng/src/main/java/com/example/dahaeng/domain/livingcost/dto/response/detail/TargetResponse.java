package com.example.dahaeng.domain.livingcost.dto.response.detail;

public record TargetResponse(
	Long id,
	String name,
	String parentRegion,
	String currency,
	String imgUrl
) {
}