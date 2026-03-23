package com.example.dahaeng.domain.country.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.country.dto.response.CountryDanger;
import com.example.dahaeng.domain.country.dto.response.CountryDangerResponse;
import com.example.dahaeng.domain.country.dto.response.CountryResponse;
import com.example.dahaeng.domain.country.service.CountryService;
import com.example.dahaeng.domain.country.service.DangerService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/country")
public class CountryController {

	private final CountryService countryService;

	private final DangerService dangerService;

	@GetMapping("/list")
	public ResponseEntity<List<CountryResponse>> list() {
		return ResponseEntity.ok(countryService.list());
	}

	/**
	 * 테스트 용 api
	 */
	@GetMapping("/danger/{id}")
	public ResponseEntity<CountryDangerResponse> dangers(@PathVariable("id") Long id) {
		return ResponseEntity.ok(dangerService.dangers(id));
	}
}
