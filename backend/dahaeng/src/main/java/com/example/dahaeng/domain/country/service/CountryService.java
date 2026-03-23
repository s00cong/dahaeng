package com.example.dahaeng.domain.country.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.country.dto.response.CountryResponse;
import com.example.dahaeng.domain.country.repository.CountryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CountryService {

	private final CountryRepository countryRepository;

	public List<CountryResponse> list() {
		return countryRepository.findAllByIsDeletedFalse()
			.stream()
			.map(CountryResponse::from)
			.toList();
	}
}
