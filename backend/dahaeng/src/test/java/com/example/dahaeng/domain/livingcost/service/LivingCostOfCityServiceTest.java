package com.example.dahaeng.domain.livingcost.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.country.enums.Continent;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostDetailRequest;
import com.example.dahaeng.domain.livingcost.dto.response.detail.LivingCostDetailResponse;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.enums.TargetType;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCityRepository;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCountryRepository;

@ExtendWith(MockitoExtension.class)
class LivingCostOfCityServiceTest {

	@Mock
	private LivingCostOfCityRepository cityRepository;

	@Mock
	private ExchangeRepository exchangeRepository;

	@Mock
	private LivingCostOfCountryRepository countryRepository;

	@InjectMocks
	private LivingCostService service;

	@Test
	void getLivingCost_multipliesAllValuesByUsdRate() {
		Country country = Country.builder()
			.id(7L)
			.currency(Currency.USD)
			.countryName("United States")
			.continent(Continent.NORTH_AMERICA)
			.build();
		City city = City.builder()
			.id(1L)
			.country(country)
			.cityName("New York")
			.imgUrl("img")
			.build();
		LivingCostOfCity livingCost = LivingCostOfCity.builder()
			.id(10L)
			.city(city)
			.dailyBudget(100.0)
			.withoutRent(2000.0)
			.food(300.0)
			.transport(50.0)
			.monthlySalaryAfterTax(4000.0)
			.population(8.0)
			.lunchMenu(15.0)
			.milk(2.0)
			.gymMonth(60.0)
			.build();
		Exchange usd = Exchange.builder()
			.id(99L)
			.currency(Currency.USD)
			.krwPer1cur(1400.0)
			.eventDate(LocalDate.of(2026, 3, 9))
			.build();

		when(cityRepository.findOneByCityId(1L)).thenReturn(Optional.of(livingCost));
		when(exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD)).thenReturn(Optional.of(usd));

		LivingCostDetailResponse result = service.detail(new LivingCostDetailRequest(TargetType.CITY, 1L));

		assertThat(result.targetType()).isEqualTo("city");
		assertThat(result.target().currency()).isEqualTo("KRW");
		assertThat(result.livingCost().dailyBudget()).isEqualTo(140000);
		assertThat(result.livingCost().withoutRent()).isEqualTo(2800000);
		assertThat(result.livingCost().food()).isEqualTo(420000);
		assertThat(result.livingCost().transport()).isEqualTo(70000);
		assertThat(result.livingCost().monthlySalaryAfterTax()).isEqualTo(5600000);
		assertThat(result.livingCost().population()).isEqualTo(8.0);
		assertThat(result.livingCost().eatingOut().lunchMenu()).isEqualTo(21000);
		assertThat(result.livingCost().groceries().milk()).isEqualTo(2800);
		assertThat(result.livingCost().other().gymMonth()).isEqualTo(84000);
	}
}
