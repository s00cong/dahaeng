package com.example.dahaeng.domain.livingcost.dto.response.card;

import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCountry;

public record LivingCostSearchedCard(
	Long id,
	String name,
	String imgUrl,
	Integer dailyBudget
) {
	public static LivingCostSearchedCard from(LivingCostOfCountry livingCost, Exchange usd) {
		Double dailyBudget = livingCost.getDailyBudget() * usd.getKrwPer1cur();

		return new LivingCostSearchedCard(
			livingCost.getCountry().getId(),
			livingCost.getCountry().getCountryName(),
			livingCost.getCountry().getImgUrl(),
			dailyBudget.intValue()
		);
	}

	public static LivingCostSearchedCard from(LivingCostOfCity livingCost, Exchange usd) {
		Double dailyBudget = livingCost.getDailyBudget() * usd.getKrwPer1cur();

		return new LivingCostSearchedCard(
			livingCost.getCity().getId(),
			livingCost.getCity().getCityName(),
			livingCost.getCity().getImgUrl(),
			dailyBudget.intValue()
		);
	}
}
