package com.example.dahaeng.domain.country.enums;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public enum CountryEnum {
	ARGENTINA("Argentina"),
	AUSTRALIA("Australia"),
	AUSTRIA("Austria"),
	BELGIUM("Belgium"),
	BOLIVIA("Bolivia"),
	BRAZIL("Brazil"),
	CAMBODIA("Cambodia"),
	CANADA("Canada"),
	CHILE("Chile"),
	CHINA("China"),
	CROATIA("Croatia"),
	CUBA("Cuba"),
	CZECH_REPUBLIC("Czech Republic"),
	DENMARK("Denmark"),
	EGYPT("Egypt"),
	FINLAND("Finland"),
	FRANCE("France"),
	GERMANY("Germany"),
	GREECE("Greece"),
	HUNGARY("Hungary"),
	ICELAND("Iceland"),
	INDIA("India"),
	INDONESIA("Indonesia"),
	ITALY("Italy"),
	JAPAN("Japan"),
	KAZAKHSTAN("Kazakhstan"),
	KENYA("Kenya"),
	LAOS("Laos"),
	MALAYSIA("Malaysia"),
	MALDIVES("Maldives"),
	MAURITIUS("Mauritius"),
	MEXICO("Mexico"),
	MONGOLIA("Mongolia"),
	MOROCCO("Morocco"),
	NEPAL("Nepal"),
	NETHERLANDS("Netherlands"),
	NEW_ZEALAND("New Zealand"),
	NORWAY("Norway"),
	PALAU("Palau"),
	PERU("Peru"),
	PHILIPPINES("Philippines"),
	POLAND("Poland"),
	PORTUGAL("Portugal"),
	QATAR("Qatar"),
	RUSSIA("Russia"),
	SINGAPORE("Singapore"),
	SOUTH_AFRICA("South Africa"),
	SOUTH_KOREA("South Korea"),
	SPAIN("Spain"),
	SWEDEN("Sweden"),
	SWITZERLAND("Switzerland"),
	TAIWAN("Taiwan"),
	THAILAND("Thailand"),
	TURKEY("Turkey"),
	UNITED_ARAB_EMIRATES("United Arab Emirates"),
	UNITED_KINGDOM("United Kingdom"),
	UNITED_STATES("United States"),
	VIETNAM("Vietnam");

	private static final Map<String, CountryEnum> BY_COUNTRY_NAME = Arrays.stream(values())
		.collect(Collectors.toUnmodifiableMap(country -> normalize(country.countryName), Function.identity()));

	private final String countryName;

	CountryEnum(String countryName) {
		this.countryName = countryName;
	}

	public String getCountryName() {
		return countryName;
	}

	public static Optional<CountryEnum> fromCountryName(String countryName) {
		if (countryName == null) {
			return Optional.empty();
		}
		return Optional.ofNullable(BY_COUNTRY_NAME.get(normalize(countryName)));
	}

	private static String normalize(String countryName) {
		return countryName.trim().toUpperCase();
	}
}
