package com.example.dahaeng.domain.city.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.city.dto.response.CityViewHistoryResponse;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.entity.CityViewHistory;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.city.repository.CityViewHistoryRepository;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCityRepository;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CityViewService {
	private final MemberRepository memberRepository;
	private final LivingCostOfCityRepository livingRepository;
	private final ExchangeRepository exchangeRepository;
	private final CityViewHistoryRepository historyRepository;
	private final CityRepository cityRepository;

	public List<CityViewHistoryResponse> history(Long memberId) {
		Member member = validMember(memberId);

		List<CityViewHistory> history = historyRepository
			.findAllByMember(member, PageRequest.of(0, 5));

		List<City> cities = history
			.stream()
			.map(CityViewHistory::getCity)
			.toList();

		Map<Long, CityViewHistory> historyMap = history
			.stream()
			.collect(Collectors.toMap(
			viewHistory -> viewHistory.getCity().getId(),
			Function.identity()
		));

		Map<Long, LivingCostOfCity> livingCostByCityId = livingRepository
			.findAllInCities(cities)
			.stream()
			.collect(
				Collectors.toMap(
				(livingCost) -> livingCost.getCity().getId(),
				Function.identity()
				)
			);

		return cities
			.stream()
			.map((city) -> CityViewHistoryResponse.from(
				city,
				getKrw(livingCostByCityId.get(city.getId()).getDailyBudget()),
				historyMap.get(city.getId()).getUpdatedAt()
			))
			.toList();
	}

	@Transactional
	public void view(Long cityId, Long memberId) {
		Member member = validMember(memberId);

		CityViewHistory cityViewHistory = historyRepository
			.findFirstByCityIdAndMemberAndIsDeletedFalseOrderByUpdatedAt(cityId, member)
			.orElseGet(() -> {
				City city = cityRepository.findById(cityId)
					.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 도시 아이디입니다."));
				CityViewHistory view = CityViewHistory.builder()
					.member(member)
					.city(city)
					.build();
				return historyRepository.save(view);
			});

		cityViewHistory.updateTime();
	}

	private Member validMember(Long memberId) {
		return memberRepository.findById(memberId)
			.orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST, "유효하지 않은 유저입니다."));
	}

	private Integer getKrw(Double usd) {
		if (usd == null) {
			return null;
		}
		Exchange exchange = exchangeRepository
			.findFirstByCurrencyOrderByEventDateDesc(Currency.USD)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "해당 통화의 환율을 찾지 못하였습니다."));

		return (int)(usd * exchange.getKrwPer1cur());
	}
}
