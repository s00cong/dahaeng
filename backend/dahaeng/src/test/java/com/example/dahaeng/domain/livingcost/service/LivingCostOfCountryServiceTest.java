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

import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.country.enums.Continent;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostDetailRequest;
import com.example.dahaeng.domain.livingcost.dto.response.detail.LivingCostDetailResponse;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCountry;
import com.example.dahaeng.domain.livingcost.enums.TargetType;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCityRepository;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCountryRepository;

@ExtendWith(MockitoExtension.class)
class LivingCostOfCountryServiceTest {

	@Mock
	private LivingCostOfCountryRepository countryRepository;

	@Mock
	private ExchangeRepository exchangeRepository;

	@Mock
	private LivingCostOfCityRepository cityRepository;

	@InjectMocks
	private LivingCostService service;

	@Test
	void getLivingCost_usesFromCityOverloadForCountry() {
		Country country = Country.builder()
			.id(2L)
			.currency(Currency.USD)
			.countryName("United States")
			.continent(Continent.NORTH_AMERICA)
			.imgUrl("img")
			.build();
		LivingCostOfCountry livingCost = LivingCostOfCountry.builder()
			.id(20L)
			.country(country)
			.dailyBudget(100.0)
			.lunchMenu(15.0)
			.build();
		Exchange usd = Exchange.builder()
			.currency(Currency.USD)
			.krwPer1cur(1400.0)
			.eventDate(LocalDate.of(2026, 3, 9))
			.build();

		when(countryRepository.findOneByCountryId(2L)).thenReturn(Optional.of(livingCost));
		when(exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD)).thenReturn(Optional.of(usd));

		LivingCostDetailResponse result = service.detail(new LivingCostDetailRequest(TargetType.COUNTRY, 2L));

		assertThat(result.targetType()).isEqualTo("country");
		assertThat(result.target().name()).isEqualTo("United States");
		assertThat(result.livingCost().dailyBudget()).isEqualTo(140000);
		assertThat(result.livingCost().eatingOut().lunchMenu()).isEqualTo(21000);
	}
}
