package com.example.dahaeng.domain.country;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.example.dahaeng.domain.country.enums.CountryEnum;

@SpringBootTest
class CountryEnumSyncTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void countryEnumShouldContainAllCountryNamesInDb() {
		List<String> countryNames = jdbcTemplate.queryForList(
			"select distinct country_name from country where country_name is not null",
			String.class
		);

		List<String> missing = countryNames.stream()
			.filter(countryName -> CountryEnum.fromCountryName(countryName).isEmpty())
			.sorted()
			.toList();

		assertThat(missing).isEmpty();
	}
}
