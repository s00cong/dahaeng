package com.example.dahaeng.domain.country;

import static org.junit.jupiter.api.Assertions.fail;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.example.dahaeng.domain.exchange.enums.Currency;

@SpringBootTest
class CountryCurrencyBackfillTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	private static final Map<String, String> CURRENCY_BY_COUNTRY = createCurrencyMap();

	@Test
	void backfillCountryCurrencyWithoutTransaction() {
		ensureCurrencyEnumContainsAllValues();

		List<Map<String, Object>> rows = jdbcTemplate.queryForList(
			"select id, country_name, currency from country"
		);

		int updated = 0;
		List<String> unresolved = new ArrayList<>();

		for (Map<String, Object> row : rows) {
			Long id = ((Number) row.get("id")).longValue();
			String countryName = String.valueOf(row.get("country_name"));
			String currentCurrency = String.valueOf(row.get("currency"));
			String targetCurrency = resolveCurrency(countryName);

			if (targetCurrency == null) {
				unresolved.add(countryName);
				continue;
			}

			if (!targetCurrency.equals(currentCurrency)) {
				updated += jdbcTemplate.update(
					"update country set currency = ? where id = ?",
					targetCurrency, id
				);
			}
		}

		System.out.println("Country currency backfill updated rows: " + updated);

		if (!unresolved.isEmpty()) {
			fail("Could not map currency for: " + unresolved);
		}
	}

	private void ensureCurrencyEnumContainsAllValues() {
		String columnType = jdbcTemplate.queryForObject(
			"""
			select COLUMN_TYPE
			from information_schema.columns
			where table_schema = database()
			  and table_name = 'country'
			  and column_name = 'currency'
			""",
			String.class
		);

		if (columnType == null || !columnType.startsWith("enum(")) {
			return;
		}

		StringBuilder enumSpec = new StringBuilder();
		for (Currency currency : Currency.values()) {
			if (!enumSpec.isEmpty()) {
				enumSpec.append(",");
			}
			enumSpec.append("'").append(currency.name()).append("'");
		}

		jdbcTemplate.execute("alter table country modify currency enum(" + enumSpec + ") not null");
	}

	private static String resolveCurrency(String countryName) {
		if (countryName == null) {
			return null;
		}
		return CURRENCY_BY_COUNTRY.get(countryName.trim().toUpperCase(Locale.ROOT));
	}

	private static Map<String, String> createCurrencyMap() {
		Map<String, String> map = new HashMap<>();

		map.put("UNITED STATES", "USD");
		map.put("USA", "USD");
		map.put("US", "USD");
		map.put("SOUTH KOREA", "KRW");
		map.put("KOREA, REPUBLIC OF", "KRW");
		map.put("KOREA", "KRW");
		map.put("JAPAN", "JPY");
		map.put("CHINA", "CNY");
		map.put("HONG KONG", "HKD");
		map.put("MACAU", "MOP");
		map.put("THAILAND", "THB");
		map.put("PHILIPPINES", "PHP");
		map.put("VIETNAM", "VND");
		map.put("TAIWAN", "TWD");
		map.put("UNITED KINGDOM", "GBP");
		map.put("UK", "GBP");
		map.put("SINGAPORE", "SGD");
		map.put("INDONESIA", "IDR");
		map.put("MALAYSIA", "MYR");
		map.put("CANADA", "CAD");
		map.put("CAMBODIA", "KHR");
		map.put("MONGOLIA", "MNT");
		map.put("AUSTRALIA", "AUD");
		map.put("NEW ZEALAND", "NZD");
		map.put("INDIA", "INR");
		map.put("BRAZIL", "BRL");
		map.put("SWITZERLAND", "CHF");
		map.put("MEXICO", "MXN");
		map.put("HUNGARY", "HUF");
		map.put("TURKEY", "TRY");
		map.put("SOUTH AFRICA", "ZAR");
		map.put("LAOS", "LAK");
		map.put("CZECH REPUBLIC", "CZK");
		map.put("CZECHIA", "CZK");
		map.put("UNITED ARAB EMIRATES", "AED");
		map.put("MALDIVES", "MVR");
		map.put("QATAR", "QAR");
		map.put("POLAND", "PLN");
		map.put("SWEDEN", "SEK");
		map.put("NORWAY", "NOK");
		map.put("PERU", "PEN");
		map.put("EGYPT", "EGP");
		map.put("MAURITIUS", "MUR");
		map.put("ICELAND", "ISK");
		map.put("DENMARK", "DKK");
		map.put("BOLIVIA", "BOB");
		map.put("ARGENTINA", "ARS");
		map.put("CHILE", "CLP");
		map.put("NEPAL", "NPR");
		map.put("KAZAKHSTAN", "KZT");
		map.put("MOROCCO", "MAD");
		map.put("CUBA", "CUP");
		map.put("KENYA", "KES");
		map.put("RUSSIA", "RUB");
		map.put("PALAU", "USD");

		map.put("FRANCE", "EUR");
		map.put("GERMANY", "EUR");
		map.put("ITALY", "EUR");
		map.put("SPAIN", "EUR");
		map.put("PORTUGAL", "EUR");
		map.put("NETHERLANDS", "EUR");
		map.put("BELGIUM", "EUR");
		map.put("AUSTRIA", "EUR");
		map.put("FINLAND", "EUR");
		map.put("CROATIA", "EUR");
		map.put("GREECE", "EUR");

		return map;
	}
}
