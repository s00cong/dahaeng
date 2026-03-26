package com.example.dahaeng.domain.flightalert.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class FlightAlertScheduler {
	private final FlightAlertBatchService flightAlertBatchService;

	@Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
	public void evaluateFlightAlerts() {
		flightAlertBatchService.evaluateActiveSubscriptions();
	}
}
