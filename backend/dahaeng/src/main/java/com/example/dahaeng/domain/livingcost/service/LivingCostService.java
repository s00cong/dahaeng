package com.example.dahaeng.domain.livingcost.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.country.entity.CountryTop;
import com.example.dahaeng.domain.country.enums.Continent;
import com.example.dahaeng.domain.country.repository.CountryTopRepository;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostCardRequest;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostComparisonRequest;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostDetailRequest;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostSearchRequest;
import com.example.dahaeng.domain.livingcost.dto.response.card.LivingCostCardResponse;
import com.example.dahaeng.domain.livingcost.dto.response.card.LivingCostRankCard;
import com.example.dahaeng.domain.livingcost.dto.response.card.LivingCostSearchedCard;
import com.example.dahaeng.domain.livingcost.dto.response.compare.LivingCostComparisonResponse;
import com.example.dahaeng.domain.livingcost.dto.response.detail.LivingCostDetailResponse;
import com.example.dahaeng.domain.livingcost.dto.response.search.LivingCostSearchedResponse;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCountry;
import com.example.dahaeng.domain.livingcost.enums.Mode;
import com.example.dahaeng.domain.livingcost.enums.SortDirection;
import com.example.dahaeng.domain.livingcost.enums.TargetType;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCityRepository;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCountryRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LivingCostService {
	private final LivingCostOfCityRepository cityRepository;
	private final LivingCostOfCountryRepository countryRepository;
	private final ExchangeRepository exchangeRepository;
	private final CountryTopRepository topRepository;

	public LivingCostDetailResponse detail(LivingCostDetailRequest request) {
		Exchange usd = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD)
			.orElseThrow(() -> new CustomException(ErrorCode.INTERNAL_ERROR, "환율 정보를 찾지 못했습니다."));

		return switch (request.targetType()) {
			case CITY -> getLivingCostOfCity(request.targetId(), usd);
			case COUNTRY -> getLivingCostOfCountry(request.targetId(), usd);
			default -> throw new CustomException(ErrorCode.EXTERNAL_API_BAD_RESPONSE, "잘못된 요청입니다.");
		};
	}

	private LivingCostDetailResponse getLivingCostOfCity(Long cityId, Exchange usd) {
		LivingCostOfCity livingCost = cityRepository.findOneByCityId(cityId)
			.orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST, "유효하지 않은 도시 아이디입니다."));

		return LivingCostDetailResponse.from(livingCost, usd.getKrwPer1cur());
	}

	private LivingCostDetailResponse getLivingCostOfCountry(Long countryId, Exchange usd) {
		LivingCostOfCountry livingCost = countryRepository.findOneByCountryId(countryId)
			.orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST, "유효하지 않은 국가 아이디입니다."));

		return LivingCostDetailResponse.from(livingCost, usd.getKrwPer1cur());
	}

	public LivingCostComparisonResponse comparison(LivingCostComparisonRequest request) {
		Exchange usd = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD)
			.orElseThrow(() -> new CustomException(ErrorCode.INTERNAL_ERROR, "환율 정보를 찾지 못했습니다."));

		return switch (request.targetType()) {
			case CITY -> getCityComparison(request.baseId(), request.targetId(), usd);
			case COUNTRY -> getCountryComparison(request.baseId(), request.targetId(), usd);
			default -> throw new CustomException(ErrorCode.EXTERNAL_API_BAD_RESPONSE, "잘못된 요청입니다.");
		};
	}

	private LivingCostComparisonResponse getCountryComparison(Long baseId, Long targetId, Exchange usd) {
		LivingCostOfCountry baseLivingCost = countryRepository.findOneByCountryId(baseId)
			.orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST, "유효하지 않은 국가 아이디입니다."));

		LivingCostOfCountry targetLivingCost = countryRepository.findOneByCountryId(targetId)
			.orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST, "유효하지 않은 국가 아이디입니다."));

		return LivingCostComparisonResponse.from(baseLivingCost, targetLivingCost, usd);
	}

	private LivingCostComparisonResponse getCityComparison(Long baseId, Long targetId, Exchange usd) {
		LivingCostOfCity baseLivingCost = cityRepository.findOneByCityId(baseId)
			.orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST, "유효하지 않은 도시 아이디입니다."));

		LivingCostOfCity targetLivingCost = cityRepository.findOneByCityId(targetId)
			.orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST, "유효하지 않은 도시 아이디입니다."));

		return LivingCostComparisonResponse.from(baseLivingCost, targetLivingCost, usd);
	}

	public LivingCostCardResponse card(LivingCostCardRequest request) {
		Exchange usd = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD)
			.orElseThrow(() -> new CustomException(ErrorCode.INTERNAL_ERROR, "환율 정보를 찾지 못했습니다."));

		if (request.mode() == null) {
			throw new CustomException(ErrorCode.INVALID_REQUEST, "모드를 선택해주세요");
		}

		return switch (request.mode()) {
			case TOP -> getTopRankCard(usd);
			case SEARCH -> getSearchedCard(request.type(), request.keyword(), request.sort(), usd);
			default -> throw new CustomException(ErrorCode.INVALID_REQUEST, "모드를 선택해주세요");
		};
	}

	private LivingCostCardResponse getTopRankCard(Exchange usd) {
		List<CountryTop> top5 = topRepository.findTopCountry(PageRequest.of(0, 5));

		List<Long> countryIds = top5
			.stream()
			.map((item) -> item.getCountry().getId())
			.toList();

		Map<Long, LivingCostOfCountry> costMap = countryRepository.findAllByCountryIds(countryIds)
			.stream()
			.collect(Collectors.toMap((cost) -> cost.getCountry().getId(), Function.identity()));

		List<LivingCostRankCard> costRankCardList = top5.stream()
			.map((countryTop) ->
				LivingCostRankCard.from(
					costMap.get(countryTop.getCountry().getId()),
					usd,
					countryTop.getRanking())
			)
			.toList();

		return new LivingCostCardResponse(Mode.TOP, costRankCardList);
	}

	private LivingCostCardResponse getSearchedCard(TargetType type, String keyword, SortDirection sort, Exchange usd) {
		return switch (type) {
			case CONTINENT -> searchByContinent(keyword, sort, usd);
			case COUNTRY -> searchByCountry(keyword, sort, usd);
			default -> throw new CustomException(ErrorCode.INVALID_REQUEST, "지원하지 않는 범위입니다.");
		};
	}

	private LivingCostCardResponse searchByContinent(String keyword, SortDirection sort, Exchange usd) {
		Continent continent = Continent.match(keyword);

		if (sort == null) {
			sort = SortDirection.ASC;
		}

		List<LivingCostOfCountry> searchedCost = switch (sort) {
			case ASC -> countryRepository.findAllByContinentOrderByDailyBudgetAsc(continent);
			case DESC -> countryRepository.findAllByContinentOrderByDailyBudgetDesc(continent);
		};

		List<LivingCostSearchedCard> searchedCardList = searchedCost
			.stream()
			.map((livingCost) -> LivingCostSearchedCard.from(livingCost, usd))
			.toList();
		return new LivingCostCardResponse(Mode.SEARCH, searchedCardList);
	}

	private LivingCostCardResponse searchByCountry(String keyword, SortDirection sort, Exchange usd) {
		String lowerKeyword = keyword.toLowerCase();

		if (sort == null) {
			sort = SortDirection.ASC;
		}

		List<LivingCostOfCity> searchedCost = switch (sort) {
			case ASC -> cityRepository.findAllByCountryKeywordOrderByDailyBudgetAsc(lowerKeyword);
			case DESC -> cityRepository.findAllByCountryKeywordOrderByDailyBudgetDesc(lowerKeyword);
		};

		List<LivingCostSearchedCard> searchedCardList = searchedCost
			.stream()
			.map((livingCost) -> LivingCostSearchedCard.from(livingCost, usd))
			.toList();

		return new LivingCostCardResponse(Mode.SEARCH, searchedCardList);
	}

	public LivingCostSearchedResponse search(LivingCostSearchRequest request) {
		Exchange usd = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD)
			.orElseThrow(() -> new CustomException(ErrorCode.INTERNAL_ERROR, "환율 정보를 찾지 못했습니다."));

		if (request.type() == null) {
			throw new CustomException(ErrorCode.INVALID_REQUEST, "타입을 선택해주세요.");
		}

		String keyword = request.keyword().toLowerCase();

		Object items =  switch (request.type()) {
			case COUNTRY -> searchCountryByKeyword(keyword, usd);
			case CITY -> searchCityByKeyword(keyword, usd);
			default -> throw new CustomException(ErrorCode.INVALID_REQUEST, "지원하지 않는 범위입니다.");
		};

		return new LivingCostSearchedResponse(request.type(), items);
	}

	private List<LivingCostSearchedCard> searchCountryByKeyword(String keyword, Exchange usd) {
		return countryRepository.findAllByNameKeyword(keyword)
			.stream()
			.map((cost) -> LivingCostSearchedCard.from(cost, usd))
			.toList();
	}

	private List<LivingCostSearchedCard> searchCityByKeyword(String keyword, Exchange usd) {
		return cityRepository.findAllByNameKeyword(keyword)
			.stream()
			.map((cost) -> LivingCostSearchedCard.from(cost, usd))
			.toList();
	}
}

