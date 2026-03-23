package com.example.dahaeng.domain.livingcost.dto.response.card;

import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCountry;

public record LivingCostRankCard(
	int rank,
	Long id,
	String name,
	String imgUrl,
	Integer dailyBudget
) {
	public static LivingCostRankCard from(LivingCostOfCountry livingCost, Exchange exchange, int rank) {
		Double dailyBudget = livingCost.getDailyBudget() * exchange.getKrwPer1cur();

		return new LivingCostRankCard(
			rank,
			livingCost.getCountry().getId(),
			livingCost.getCountry().getCountryName(),
			livingCost.getCountry().getImgUrl(),
			dailyBudget.intValue()
		);
	}

	public static LivingCostRankCard from(LivingCostOfCity livingCost, Exchange exchange, int rank) {
		Double dailyBudget = livingCost.getDailyBudget() * exchange.getKrwPer1cur();

		return new LivingCostRankCard(
			rank,
			livingCost.getCity().getId(),
			livingCost.getCity().getCityName(),
			livingCost.getCity().getImgUrl(),
			dailyBudget.intValue()
		);
	}
}
