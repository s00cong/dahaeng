package com.example.dahaeng.domain.country.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.example.dahaeng.domain.country.dto.response.CountryDanger;
import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.country.entity.Danger;
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
		if (danger == null) {
			return new CountryDangerResponse(
				country != null ? country.getCountryName() : null,
				List.of()
			);
		}

		List<CountryDanger> res = new ArrayList<>();

		addAttention(res, danger);
		addBan(res, danger);
		addLimita(res, danger);
		addSpecial(res, danger);

		return new CountryDangerResponse(danger.getCountry().getCountryName(), res);
	}

	private void addSpecial(List<CountryDanger> res, Danger danger) {
		if (danger.getEvacuateRegionTy() != null && !danger.getEvacuateRegionTy().isEmpty()) {
			addDanger(res, "특별여행주의보(" + danger.getEvacuateRegionTy() + ")", danger.getEvacuateRcmndRemark());
		}
		if (danger.getForbiddenRegionTy() != null && !danger.getForbiddenRegionTy().isEmpty()) {
			addDanger(res, "특별여행주의보(" + danger.getForbiddenRegionTy() + ")", danger.getForbiddenRcmndRemark());
		}
	}

	private void addAttention(List<CountryDanger> res, Danger danger) {
		addDanger(res, danger.getAttention(), danger.getAttentionNote());
		addDanger(res, danger.getAttentionPartial(), danger.getAttentionNote());
	}

	private void addBan(List<CountryDanger> res, Danger danger) {
		addDanger(res, danger.getBanYna(), danger.getBanNote());
		addDanger(res, danger.getBanYnPartial(), danger.getBanNote());

	}

	private void addLimita(List<CountryDanger> res, Danger danger) {
		addDanger(res, danger.getLimita(), danger.getLimitaNote());
		addDanger(res, danger.getLimitaPartial(), danger.getLimitaNote());
	}

	private static void addDanger(List<CountryDanger> res, String level, String description) {
		if (StringUtils.hasText(level)) {
			res.add(
				new CountryDanger(
					level,
					description
				)
			);
		}
	}
}
