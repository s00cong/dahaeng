package com.example.dahaeng.domain.livingcost.dto.response.detail;

import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCountry;
import com.example.dahaeng.domain.livingcost.enums.TargetType;

public record LivingCostDetailResponse(
	String targetType,
	TargetResponse target,
	LivingCostResponse livingCost
) {
	public static LivingCostDetailResponse from(LivingCostOfCity livingCost, double rate) {
		TargetResponse target = new TargetResponse(
			livingCost.getCity().getId(),
			livingCost.getCity().getCityName(),
			livingCost.getCity().getCountry().getCountryName(),
			livingCost.getCity().getCountry().getCurrency(),
			livingCost.getCity().getImgUrl()
		);

		LivingCostResponse livingCostResponse = new LivingCostResponse(
			livingCost.getId(),
			multiply(livingCost.getDailyBudget(), rate),
			multiply(livingCost.getWithoutRent(), rate),
			multiply(livingCost.getFood(), rate),
			multiply(livingCost.getTransport(), rate),
			multiply(livingCost.getMonthlySalaryAfterTax(), rate),
			livingCost.getPopulation(),
			new EatingOutResponse(
				multiply(livingCost.getLunchMenu(), rate),
				multiply(livingCost.getDinnerInAResturantFor2(), rate),
				multiply(livingCost.getFastFoodMeal(), rate),
				multiply(livingCost.getBeerInAPub(), rate),
				multiply(livingCost.getCappuccino(), rate),
				multiply(livingCost.getCokePepsi(), rate)
			),
			new TransportationResponse(
				multiply(livingCost.getLocalTransportTicket(), rate),
				multiply(livingCost.getMonthlyTicketLocalTransport(), rate),
				multiply(livingCost.getTaxiRide(), rate),
				multiply(livingCost.getGasPetrol(), rate)
			),
			new GroceriesResponse(
				multiply(livingCost.getMilk(), rate),
				multiply(livingCost.getBread(), rate),
				multiply(livingCost.getRice(), rate),
				multiply(livingCost.getEgg(), rate),
				multiply(livingCost.getChicken(), rate),
				multiply(livingCost.getSteak(), rate),
				multiply(livingCost.getApple(), rate),
				multiply(livingCost.getBanana(), rate),
				multiply(livingCost.getOrange(), rate),
				multiply(livingCost.getTomato(), rate),
				multiply(livingCost.getPotato(), rate),
				multiply(livingCost.getOnion(), rate),
				multiply(livingCost.getWater(), rate),
				multiply(livingCost.getCoke(), rate),
				multiply(livingCost.getWine(), rate),
				multiply(livingCost.getBeer(), rate),
				multiply(livingCost.getCigarette(), rate),
				multiply(livingCost.getColdMedicine(), rate),
				multiply(livingCost.getShampoo(), rate),
				multiply(livingCost.getToiletPaper(), rate),
				multiply(livingCost.getToothpaste(), rate)
			),
			new OtherResponse(
				multiply(livingCost.getGymMonth(), rate),
				multiply(livingCost.getCinemaTicket(), rate),
				multiply(livingCost.getHaircut(), rate),
				multiply(livingCost.getBrandJeans(), rate),
				multiply(livingCost.getBrandSneakers(), rate)
			),
			livingCost.getCreatedAt(),
			livingCost.getUpdatedAt()
		);

		return new LivingCostDetailResponse(
			TargetType.CITY.getValue(),
			target,
			livingCostResponse
		);
	}

	public static LivingCostDetailResponse from(LivingCostOfCountry livingCost, double rate) {
		TargetResponse target = new TargetResponse(
			livingCost.getCountry().getId(),
			livingCost.getCountry().getCountryName(),
			livingCost.getCountry().getContinent().name(),
			livingCost.getCountry().getCurrency(),
			livingCost.getCountry().getImgUrl()
		);

		LivingCostResponse livingCostResponse = new LivingCostResponse(
			livingCost.getId(),
			multiply(livingCost.getDailyBudget(), rate),
			multiply(livingCost.getWithoutRent(), rate),
			multiply(livingCost.getFood(), rate),
			multiply(livingCost.getTransport(), rate),
			multiply(livingCost.getMonthlySalaryAfterTax(), rate),
			livingCost.getPopulation(),
			new EatingOutResponse(
				multiply(livingCost.getLunchMenu(), rate),
				multiply(livingCost.getDinnerInAResturantFor2(), rate),
				multiply(livingCost.getFastFoodMeal(), rate),
				multiply(livingCost.getBeerInAPub(), rate),
				multiply(livingCost.getCappuccino(), rate),
				multiply(livingCost.getCokePepsi(), rate)
			),
			new TransportationResponse(
				multiply(livingCost.getLocalTransportTicket(), rate),
				multiply(livingCost.getMonthlyTicketLocalTransport(), rate),
				multiply(livingCost.getTaxiRide(), rate),
				multiply(livingCost.getGasPetrol(), rate)
			),
			new GroceriesResponse(
				multiply(livingCost.getMilk(), rate),
				multiply(livingCost.getBread(), rate),
				multiply(livingCost.getRice(), rate),
				multiply(livingCost.getEgg(), rate),
				multiply(livingCost.getChicken(), rate),
				multiply(livingCost.getSteak(), rate),
				multiply(livingCost.getApple(), rate),
				multiply(livingCost.getBanana(), rate),
				multiply(livingCost.getOrange(), rate),
				multiply(livingCost.getTomato(), rate),
				multiply(livingCost.getPotato(), rate),
				multiply(livingCost.getOnion(), rate),
				multiply(livingCost.getWater(), rate),
				multiply(livingCost.getCoke(), rate),
				multiply(livingCost.getWine(), rate),
				multiply(livingCost.getBeer(), rate),
				multiply(livingCost.getCigarette(), rate),
				multiply(livingCost.getColdMedicine(), rate),
				multiply(livingCost.getShampoo(), rate),
				multiply(livingCost.getToiletPaper(), rate),
				multiply(livingCost.getToothpaste(), rate)
			),
			new OtherResponse(
				multiply(livingCost.getGymMonth(), rate),
				multiply(livingCost.getCinemaTicket(), rate),
				multiply(livingCost.getHaircut(), rate),
				multiply(livingCost.getBrandJeans(), rate),
				multiply(livingCost.getBrandSneakers(), rate)
			),
			livingCost.getCreatedAt(),
			livingCost.getUpdatedAt()
		);

		return new LivingCostDetailResponse(
			TargetType.COUNTRY.getValue(),
			target,
			livingCostResponse
		);
	}

	private static Integer multiply(Double value, double rate) {
		if (value == null) {
			return null;
		}
		return (int)Math.round(value * rate);
	}
}
