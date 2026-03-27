package com.example.dahaeng.domain.exchange.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.exchange.dto.request.ExchangeHistoryRequest;
import com.example.dahaeng.domain.exchange.dto.response.current.ExchangeRateResponse;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.service.ExchangeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/exchange-rate")
@RequiredArgsConstructor
public class ExchangeController {
	private final ExchangeService exchangeService;

	@GetMapping
	public ResponseEntity<ExchangeRateResponse> current(@RequestParam("currency") Currency currency) {
		return ResponseEntity.ok(exchangeService.getCurrentExchange(currency));
	}

	@GetMapping("/history")
	public ResponseEntity<?> history(@ModelAttribute ExchangeHistoryRequest request) {
		return ResponseEntity.ok(exchangeService.getExchangeHistory(request));
	}
}
