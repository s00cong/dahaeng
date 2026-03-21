package com.example.dahaeng.domain.livingcost.dto.response.compare;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.country.enums.Continent;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;

class LivingCostComparisonResponseTest {

	@Test
	void fromCity_usesAverageOfNormalizedItemRatiosForDailyBudgetGapPercent() {
		LivingCostOfCity base = cityCost(
			"Seoul",
			100.0,
			10.0,
			20.0,
			8.0,
			5.0,
			2.0,
			3.0,
			10.0,
			50.0,
			100.0
		);
		LivingCostOfCity target = cityCost(
			"Tokyo",
			150.0,
			12.0,
			18.0,
			10.0,
			6.0,
			1.0,
			6.0,
			20.0,
			75.0,
			150.0
		);

		LivingCostComparisonResponse response = LivingCostComparisonResponse.from(base, target, usdRate());

		assertThat(response.costCompare().dailyBudgetGapPercent()).isEqualTo(40.5);
	}

	@Test
	void fromCity_ignoresMissingOrZeroBaseItemsWhenAveragingNormalizedRatios() {
		LivingCostOfCity base = cityCost(
			"Seoul",
			100.0,
			10.0,
			20.0,
			8.0,
			5.0,
			2.0,
			3.0,
			10.0,
			0.0,
			null
		);
		LivingCostOfCity target = cityCost(
			"Tokyo",
			150.0,
			15.0,
			20.0,
			8.0,
			10.0,
			2.0,
			3.0,
			10.0,
			120.0,
			180.0
		);

		LivingCostComparisonResponse response = LivingCostComparisonResponse.from(base, target, usdRate());

		assertThat(response.costCompare().dailyBudgetGapPercent()).isEqualTo(18.7);
	}

	@Test
	void fromCity_excludesAccommodationFromExpectedDailyBudgetBreakdownAndNotes() {
		LivingCostOfCity base = cityCost(
			"Seoul",
			100.0,
			10.0,
			20.0,
			8.0,
			5.0,
			2.0,
			3.0,
			10.0,
			50.0,
			100.0
		);
		LivingCostOfCity target = cityCost(
			"Tokyo",
			150.0,
			12.0,
			18.0,
			10.0,
			6.0,
			1.0,
			6.0,
			20.0,
			75.0,
			150.0
		);

		LivingCostComparisonResponse response = LivingCostComparisonResponse.from(base, target, usdRate());

		assertThat(response.expectedTargetDailyBudget().breakdown().food()).isEqualTo(34);
		assertThat(response.expectedTargetDailyBudget().breakdown().transport()).isEqualTo(12);
		assertThat(response.expectedTargetDailyBudget().calculationNotes())
			.containsExactly(
				"food = estimated breakfast + lunch + dinner + cappuccino + coke/pepsi",
				"transport = average daily local transport usage"
			);
	}

	@Test
	void fromCity_addsLocalCostCompareAndAffordabilityCompareUsingUsdCalculationsBeforeKrwConversion() {
		LivingCostOfCity base = cityCost(
			"Seoul",
			100.0,
			10.0,
			20.0,
			8.0,
			5.0,
			2.0,
			3.0,
			10.0,
			50.0,
			100.0,
			3000.0
		);
		LivingCostOfCity target = cityCost(
			"Tokyo",
			150.0,
			12.0,
			18.0,
			10.0,
			6.0,
			1.0,
			6.0,
			20.0,
			75.0,
			150.0,
			6000.0
		);

		LivingCostComparisonResponse response = LivingCostComparisonResponse.from(base, target, usdRate(1000.0));

		assertThat(response.localCostCompare()).isNotNull();
		assertThat(response.localCostCompare().currency()).isEqualTo("KRW");
		assertThat(response.localCostCompare().baseLocalDailyCost()).isEqualTo(38000);
		assertThat(response.localCostCompare().targetLocalDailyCost()).isEqualTo(46000);
		assertThat(response.localCostCompare().localDailyCostGap()).isEqualTo(8000);
		assertThat(response.localCostCompare().localDailyCostGapPercent()).isEqualTo(21.1);

		assertThat(response.affordabilityCompare()).isNotNull();
		assertThat(response.affordabilityCompare().currency()).isEqualTo("KRW");
		assertThat(response.affordabilityCompare().baseDailyIncome()).isEqualTo(100000);
		assertThat(response.affordabilityCompare().targetDailyIncome()).isEqualTo(200000);
		assertThat(response.affordabilityCompare().baseLocalCostBurdenPercent()).isEqualTo(38.0);
		assertThat(response.affordabilityCompare().targetLocalCostBurdenPercent()).isEqualTo(23.0);
		assertThat(response.affordabilityCompare().burdenGapPercentPoint()).isEqualTo(-15.0);
		assertThat(response.affordabilityCompare().targetMoreAffordable()).isTrue();
	}

	@Test
	void fromCity_returnsNullAffordabilityCompareWhenSalaryIsMissing() {
		LivingCostOfCity base = cityCost(
			"Seoul",
			100.0,
			10.0,
			20.0,
			8.0,
			5.0,
			2.0,
			3.0,
			10.0,
			50.0,
			100.0,
			null
		);
		LivingCostOfCity target = cityCost(
			"Tokyo",
			150.0,
			12.0,
			18.0,
			10.0,
			6.0,
			1.0,
			6.0,
			20.0,
			75.0,
			150.0,
			6000.0
		);

		LivingCostComparisonResponse response = LivingCostComparisonResponse.from(base, target, usdRate(1000.0));

		assertThat(response.localCostCompare()).isNotNull();
		assertThat(response.affordabilityCompare()).isNull();
	}

	private static LivingCostOfCity cityCost(
		String cityName,
		Double dailyBudget,
		Double lunchMenu,
		Double dinnerFor2,
		Double fastFood,
		Double cappuccino,
		Double cokePepsi,
		Double localTransportTicket,
		Double taxiRide,
		Double brandJeans,
		Double brandSneakers
	) {
		return cityCost(
			cityName,
			dailyBudget,
			lunchMenu,
			dinnerFor2,
			fastFood,
			cappuccino,
			cokePepsi,
			localTransportTicket,
			taxiRide,
			brandJeans,
			brandSneakers,
			3000.0
		);
	}

	private static LivingCostOfCity cityCost(
		String cityName,
		Double dailyBudget,
		Double lunchMenu,
		Double dinnerFor2,
		Double fastFood,
		Double cappuccino,
		Double cokePepsi,
		Double localTransportTicket,
		Double taxiRide,
		Double brandJeans,
		Double brandSneakers,
		Double monthlySalaryAfterTax
	) {
		Country country = Country.builder()
			.id(1L)
			.countryName("Korea")
			.currency(Currency.USD)
			.continent(Continent.ASIA)
			.imgUrl("country.png")
			.build();

		City city = City.builder()
			.id(1L)
			.cityName(cityName)
			.country(country)
			.imgUrl("city.png")
			.build();

		return LivingCostOfCity.builder()
			.city(city)
			.dailyBudget(dailyBudget)
			.withoutRent(90.0)
			.food(30.0)
			.transport(10.0)
			.monthlySalaryAfterTax(monthlySalaryAfterTax)
			.population(1_000_000.0)
			.lunchMenu(lunchMenu)
			.dinnerInAResturantFor2(dinnerFor2)
			.fastFoodMeal(fastFood)
			.cappuccino(cappuccino)
			.cokePepsi(cokePepsi)
			.localTransportTicket(localTransportTicket)
			.taxiRide(taxiRide)
			.brandJeans(brandJeans)
			.brandSneakers(brandSneakers)
			.build();
	}

	private static Exchange usdRate() {
		return usdRate(1.0);
	}

	private static Exchange usdRate(double rate) {
		return Exchange.builder()
			.currency(Currency.USD)
			.krwPer1cur(rate)
			.eventDate(LocalDate.of(2026, 3, 20))
			.build();
	}
}
