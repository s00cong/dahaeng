package com.example.dahaeng.domain.country.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.example.dahaeng.domain.country.dto.response.CountryDanger;
import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.country.entity.Danger;
import com.example.dahaeng.domain.country.enums.DangerLevel;
import com.example.dahaeng.domain.country.repository.CountryRepository;
import com.example.dahaeng.domain.country.repository.DangerRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DangerService {

	private final DangerRepository dangerRepository;
	private final CountryRepository countryRepository;

	public CountryDangerResponse dangers(Long countryId) {
		Country country = countryRepository.findById(countryId).orElse(null);
		Danger danger = dangerRepository.findByCountryId(countryId).orElse(null);
		return toCountryDangerResponse(country, danger);
	}

	public Map<Long, CountryDangerResponse> dangersByCountryIds(List<Long> countryIds) {
		if (countryIds == null || countryIds.isEmpty()) {
			return Map.of();
		}

		Map<Long, Country> countryMap = countryRepository.findAllByIdInAndIsDeletedFalse(countryIds).stream()
			.collect(java.util.stream.Collectors.toMap(Country::getId, country -> country));
		Map<Long, Danger> dangerMap = dangerRepository.findAllByCountryIds(countryIds).stream()
			.collect(java.util.stream.Collectors.toMap(danger -> danger.getCountry().getId(), danger -> danger));

		Map<Long, CountryDangerResponse> result = new HashMap<>();
		for (Long countryId : countryIds) {
			result.put(countryId, toCountryDangerResponse(countryMap.get(countryId), dangerMap.get(countryId)));
		}
		return result;
	}

	private void addSpecial(List<CountryDanger> res, Danger danger) {
		if (danger.getEvacuateRegionTy() != null && !danger.getEvacuateRegionTy().isEmpty()) {
			addDanger(res, "특별여행주의보(" + danger.getEvacuateRegionTy() + ")", DangerLevel.CONTROL.getLevel(), danger.getEvacuateRcmndRemark());
		}
		if (danger.getForbiddenRegionTy() != null && !danger.getForbiddenRegionTy().isEmpty()) {
			addDanger(res, "특별여행주의보(" + danger.getForbiddenRegionTy() + ")", DangerLevel.LIMIT.getLevel(), danger.getForbiddenRcmndRemark());
		}
	}

	private void addAttention(List<CountryDanger> res, Danger danger) {
		addDanger(res, danger.getAttention(), DangerLevel.ATTENTION.getLevel(), danger.getAttentionNote());
		addDanger(res, danger.getAttentionPartial(), DangerLevel.ATTENTION.getLevel(), danger.getAttentionNote());
	}

	private void addBan(List<CountryDanger> res, Danger danger) {
		addDanger(res, danger.getBanYna(), DangerLevel.BAN.getLevel(), danger.getBanNote());
		addDanger(res, danger.getBanYnPartial(), DangerLevel.BAN.getLevel(), danger.getBanNote());
	}

	private void addControl(List<CountryDanger> res, Danger danger) {
		addDanger(res, danger.getControl(), DangerLevel.CONTROL.getLevel(), danger.getControlNote());
		addDanger(res, danger.getControlPartial(), DangerLevel.CONTROL.getLevel(), danger.getControlNote());
	}

	private void addLimita(List<CountryDanger> res, Danger danger) {
		addDanger(res, danger.getLimita(), DangerLevel.LIMIT.getLevel(), danger.getLimitaNote());
		addDanger(res, danger.getLimitaPartial(), DangerLevel.LIMIT.getLevel(), danger.getLimitaNote());
	}

	private static void addDanger(List<CountryDanger> res, String level, String levelString, String description) {
		if (StringUtils.hasText(level)) {
			res.add(
				new CountryDanger(
					level + levelString,
					description
				)
			);
		}
	}

	private CountryDangerResponse toCountryDangerResponse(Country country, Danger danger) {
		if (danger == null) {
			return new CountryDangerResponse(
				country != null ? country.getCountryName() : null,
				List.of()
			);
		}

		List<CountryDanger> res = new ArrayList<>();

		addAttention(res, danger);
		addControl(res, danger);
		addLimita(res, danger);
		addBan(res, danger);
		addSpecial(res, danger);

		return new CountryDangerResponse(danger.getCountry().getCountryName(), res);
	}
}
