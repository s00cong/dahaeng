package com.example.dahaeng.domain.livingcost.dto.response.compare;

import java.util.List;

import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.livingcost.dto.response.detail.TargetResponse;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCountry;

/**
 * TODO: 숙박비 받아서 계산하기
 */
public record LivingCostComparisonResponse(
	TargetResponse base,
	TargetResponse target,
	CostVsBaseResponse costCompare,
	LocalCostCompareResponse localCostCompare,
	AffordabilityCompareResponse affordabilityCompare,
	ExpectedDailyBudgetResponse expectedTargetDailyBudget,
	ItemComparisonResponse itemComparison
) {
	public static LivingCostComparisonResponse from(LivingCostOfCity base, LivingCostOfCity target, Exchange usd) {
		double rate = usd.getKrwPer1cur();

		double food = nvl(target.getLunchMenu()) * 1.5 + nvl(target.getCappuccino()) + nvl(target.getCokePepsi()) + nvl(target.getDinnerInAResturantFor2()) / 2;
		double transport = nvl(target.getLocalTransportTicket()) * 2;

		return build(
			new TargetResponse(
				base.getCity().getId(),
				base.getCity().getCityName(),
				base.getCity().getCountry().getCountryName(),
				base.getCity().getCountry().getCurrency().name(),
				base.getCity().getImgUrl()
			),
			new TargetResponse(
				target.getCity().getId(),
				target.getCity().getCityName(),
				target.getCity().getCountry().getCountryName(),
				target.getCity().getCountry().getCurrency().name(),
				target.getCity().getImgUrl()
			),
			base.getDailyBudget(),
			target.getDailyBudget(),
			base.getMonthlySalaryAfterTax(),
			target.getMonthlySalaryAfterTax(),
			food,
			transport,
			base.getLunchMenu(), target.getLunchMenu(),
			base.getDinnerInAResturantFor2(), target.getDinnerInAResturantFor2(),
			base.getFastFoodMeal(), target.getFastFoodMeal(),
			base.getCappuccino(), target.getCappuccino(),
			base.getCokePepsi(), target.getCokePepsi(),
			base.getLocalTransportTicket(), target.getLocalTransportTicket(),
			base.getTaxiRide(), target.getTaxiRide(),
			base.getBrandJeans(), target.getBrandJeans(),
			base.getBrandSneakers(), target.getBrandSneakers(),
			rate
		);
	}

	public static LivingCostComparisonResponse from(LivingCostOfCountry base, LivingCostOfCountry target, Exchange usd) {
		double rate = usd.getKrwPer1cur();
		double food = nvl(target.getLunchMenu()) * 1.5 + nvl(target.getCappuccino()) + nvl(target.getCokePepsi()) + nvl(target.getDinnerInAResturantFor2()) / 2;
		double transport = nvl(target.getLocalTransportTicket()) * 2;

		return build(
			new TargetResponse(
				base.getCountry().getId(),
				base.getCountry().getCountryName(),
				base.getCountry().getContinent().name(),
				base.getCountry().getCurrency().name(),
				base.getCountry().getImgUrl()
			),
			new TargetResponse(
				target.getCountry().getId(),
				target.getCountry().getCountryName(),
				target.getCountry().getContinent().name(),
				target.getCountry().getCurrency().name(),
				target.getCountry().getImgUrl()
			),
			base.getDailyBudget(),
			target.getDailyBudget(),
			base.getMonthlySalaryAfterTax(),
			target.getMonthlySalaryAfterTax(),
			food,
			transport,
			base.getLunchMenu(), target.getLunchMenu(),
			base.getDinnerInAResturantFor2(), target.getDinnerInAResturantFor2(),
			base.getFastFoodMeal(), target.getFastFoodMeal(),
			base.getCappuccino(), target.getCappuccino(),
			base.getCokePepsi(), target.getCokePepsi(),
			base.getLocalTransportTicket(), target.getLocalTransportTicket(),
			base.getTaxiRide(), target.getTaxiRide(),
			base.getBrandJeans(), target.getBrandJeans(),
			base.getBrandSneakers(), target.getBrandSneakers(),
			rate
		);
	}

	private static LivingCostComparisonResponse build(
		TargetResponse baseTarget,
		TargetResponse targetTarget,
		Double baseDailyBudget,
		Double targetDailyBudget,
		Double baseMonthlySalaryAfterTax,
		Double targetMonthlySalaryAfterTax,
		Double targetFood,
		Double targetTransport,
		Double baseLunchMenu, Double targetLunchMenu,
		Double baseDinnerFor2, Double targetDinnerFor2,
		Double baseBigMac, Double targetBigMac,
		Double baseCappuccino, Double targetCappuccino,
		Double baseCoke, Double targetCoke,
		Double baseBusTicket, Double targetBusTicket,
		Double baseTaxiRide, Double targetTaxiRide,
		Double baseBrandJeans, Double targetBrandJeans,
		Double baseBrandSneakers, Double targetBrandSneakers,
		double rate
	) {
		int baseDaily = toKrw(baseDailyBudget, rate);
		int targetDaily = toKrw(targetDailyBudget, rate);
		int dailyGap = targetDaily - baseDaily;
		double baseLocalDailyCostUsd = localDailyCostUsd(
			baseLunchMenu,
			baseDinnerFor2,
			baseCappuccino,
			baseCoke,
			baseBusTicket
		);
		double targetLocalDailyCostUsd = localDailyCostUsd(
			targetLunchMenu,
			targetDinnerFor2,
			targetCappuccino,
			targetCoke,
			targetBusTicket
		);
		double normalizedGapPercent = weightedCategoryGapPercent(
			categoryAverageRatio(
				baseLunchMenu, targetLunchMenu,
				baseDinnerFor2, targetDinnerFor2,
				baseBigMac, targetBigMac,
				baseCappuccino, targetCappuccino,
				baseCoke, targetCoke
			),
			0.5,
			categoryAverageRatio(
				baseBusTicket, targetBusTicket,
				baseTaxiRide, targetTaxiRide
			),
			0.3,
			categoryAverageRatio(
				baseBrandJeans, targetBrandJeans,
				baseBrandSneakers, targetBrandSneakers
			),
			0.2
		);

		CostVsBaseResponse costCompare = new CostVsBaseResponse(
			"KRW",
			baseDaily,
			targetDaily,
			dailyGap,
			normalizedGapPercent
		);
		LocalCostCompareResponse localCostCompare = new LocalCostCompareResponse(
			"KRW",
			toKrw(baseLocalDailyCostUsd, rate),
			toKrw(targetLocalDailyCostUsd, rate),
			toKrw(targetLocalDailyCostUsd - baseLocalDailyCostUsd, rate),
			percent(targetLocalDailyCostUsd - baseLocalDailyCostUsd, baseLocalDailyCostUsd)
		);
		AffordabilityCompareResponse affordabilityCompare = affordabilityCompare(
			baseMonthlySalaryAfterTax,
			targetMonthlySalaryAfterTax,
			baseLocalDailyCostUsd,
			targetLocalDailyCostUsd,
			rate
		);

		int food = toKrw(targetFood, rate);
		int transport = toKrw(targetTransport, rate);

		ExpectedDailyBudgetResponse expectedDailyBudget = new ExpectedDailyBudgetResponse(
			"KRW",
			targetDaily,
			new BreakdownResponse(food, transport),
			List.of(
				"food = estimated breakfast + lunch + dinner + cappuccino + coke/pepsi",
				"transport = average daily local transport usage"
			)
		);

		List<ItemComparisonDetailResponse> items = List.of(
			item("lunch_menu", "Lunch menu", baseLunchMenu, targetLunchMenu, rate),
			item("dinner_for_2", "Dinner for 2", baseDinnerFor2, targetDinnerFor2, rate),
			item("big_mac", "Big mac", baseBigMac, targetBigMac, rate),
			item("cappuccino", "Cappuccino", baseCappuccino, targetCappuccino, rate),
			item("coke", "Coke", baseCoke, targetCoke, rate),
			item("bus_ticket", "Bus ticket", baseBusTicket, targetBusTicket, rate),
			item("taxi_8km", "Taxi 8km", baseTaxiRide, targetTaxiRide, rate),
			item("brand_jeans", "Brand jeans", baseBrandJeans, targetBrandJeans, rate),
			item("brand_sneakers", "Brand sneakers", baseBrandSneakers, targetBrandSneakers, rate)
		);

		ItemComparisonResponse itemComparison = new ItemComparisonResponse(
			"KRW",
			baseTarget.name(),
			targetTarget.name(),
			items
		);

		return new LivingCostComparisonResponse(
			baseTarget,
			targetTarget,
			costCompare,
			localCostCompare,
			affordabilityCompare,
			expectedDailyBudget,
			itemComparison
		);
	}

	private static ItemComparisonDetailResponse item(String key, String name, Double base, Double target, double rate) {
		int baseKrw = toKrw(base, rate);
		int targetKrw = toKrw(target, rate);
		int diff = targetKrw - baseKrw;
		return new ItemComparisonDetailResponse(key, name, baseKrw, targetKrw, diff, percent(diff, baseKrw));
	}

	private static int toKrw(Double value, double rate) {
		if (value == null) {
			return 0;
		}
		return (int) Math.round(value * rate);
	}

	private static double nvl(Double value) {
		return value == null ? 0.0 : value;
	}

	private static double percent(int gap, int base) {
		if (base == 0) {
			return 0.0;
		}
		return Math.round(((gap * 100.0) / base) * 10.0) / 10.0;
	}

	private static double percent(double gap, double base) {
		if (base <= 0) {
			return 0.0;
		}
		return Math.round(((gap * 100.0) / base) * 10.0) / 10.0;
	}

	private static double localDailyCostUsd(
		Double lunchMenu,
		Double dinnerFor2,
		Double cappuccino,
		Double cokePepsi,
		Double localTransportTicket
	) {
		double breakfast = nvl(lunchMenu) * 0.5;
		double lunch = nvl(lunchMenu);
		double dinner = nvl(dinnerFor2) / 2.0;
		double coffee = nvl(cappuccino);
		double drink = nvl(cokePepsi);
		double transport = nvl(localTransportTicket) * 2.0;
		return breakfast + lunch + dinner + coffee + drink + transport;
	}

	private static AffordabilityCompareResponse affordabilityCompare(
		Double baseMonthlySalaryAfterTax,
		Double targetMonthlySalaryAfterTax,
		double baseLocalDailyCostUsd,
		double targetLocalDailyCostUsd,
		double rate
	) {
		if (!hasPositiveValue(baseMonthlySalaryAfterTax) || !hasPositiveValue(targetMonthlySalaryAfterTax)) {
			return null;
		}

		double baseDailyIncomeUsd = baseMonthlySalaryAfterTax / 30.0;
		double targetDailyIncomeUsd = targetMonthlySalaryAfterTax / 30.0;
		double baseBurdenRate = percent(baseLocalDailyCostUsd, baseDailyIncomeUsd);
		double targetBurdenRate = percent(targetLocalDailyCostUsd, targetDailyIncomeUsd);

		return new AffordabilityCompareResponse(
			"KRW",
			toKrw(baseDailyIncomeUsd, rate),
			toKrw(targetDailyIncomeUsd, rate),
			baseBurdenRate,
			targetBurdenRate,
			Math.round((targetBurdenRate - baseBurdenRate) * 10.0) / 10.0,
			targetBurdenRate < baseBurdenRate
		);
	}

	private static boolean hasPositiveValue(Double value) {
		return value != null && value > 0;
	}

	private static double weightedCategoryGapPercent(double foodRatio, double foodWeight, double transportRatio,
		double transportWeight, double etcRatio, double etcWeight) {
		double weightedSum = 0.0;
		double totalWeight = 0.0;

		if (foodRatio > 0) {
			weightedSum += foodRatio * foodWeight;
			totalWeight += foodWeight;
		}
		if (transportRatio > 0) {
			weightedSum += transportRatio * transportWeight;
			totalWeight += transportWeight;
		}
		if (etcRatio > 0) {
			weightedSum += etcRatio * etcWeight;
			totalWeight += etcWeight;
		}

		if (totalWeight == 0.0) {
			return 0.0;
		}

		double averageRatio = weightedSum / totalWeight;
		return Math.round((averageRatio - 1.0) * 1000.0) / 10.0;
	}

	private static double categoryAverageRatio(Double... values) {
		double ratioSum = 0.0;
		int ratioCount = 0;

		for (int i = 0; i < values.length; i += 2) {
			Double base = values[i];
			Double target = values[i + 1];
			if (base == null || target == null || base <= 0) {
				continue;
			}

			ratioSum += target / base;
			ratioCount++;
		}

		if (ratioCount == 0) {
			return -1.0;
		}

		return ratioSum / ratioCount;
	}
}
