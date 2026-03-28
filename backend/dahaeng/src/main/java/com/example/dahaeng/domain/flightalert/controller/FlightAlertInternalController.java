package com.example.dahaeng.domain.flightalert.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.flightalert.service.FlightAlertBatchService;

@RestController
@RequestMapping("/api/internal/flight-alerts")
public class FlightAlertInternalController {

	private final FlightAlertBatchService batchService;
	private final String internalRunToken;

	public FlightAlertInternalController(
		FlightAlertBatchService batchService,
		@Value("${flight-alert.internal-run-token:}") String internalRunToken
	) {
		this.batchService = batchService;
		this.internalRunToken = internalRunToken;
	}

	@PostMapping("/run")
	public ResponseEntity<Map<String, String>> runBatch(
		@RequestHeader(value = "X-Internal-Token", required = false) String requestToken
	) {
		if (!StringUtils.hasText(internalRunToken)) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
				.body(Map.of("message", "internal run token not configured"));
		}

		if (!internalRunToken.equals(requestToken)) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(Map.of("message", "invalid internal token"));
		}

		batchService.evaluateActiveSubscriptions();
		return ResponseEntity.accepted().body(Map.of("status", "triggered"));
	}
}
