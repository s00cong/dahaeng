package com.example.dahaeng.domain.flightalert.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.example.dahaeng.domain.flightalert.event.FlightAlertCreatedEvent;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class FlightAlertEmailEventListener {

	private static final Logger log = LoggerFactory.getLogger(FlightAlertEmailEventListener.class);

	private final JavaMailSender mailSender;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handleFlightAlertCreated(FlightAlertCreatedEvent event) {
		try {
			SimpleMailMessage message = new SimpleMailMessage();
			message.setTo(event.email());
			message.setSubject("[다행] " + event.cityName() + " 항공권 가격 알림");
			message.setText(buildMessage(event));
			mailSender.send(message);
		} catch (Exception e) {
			log.warn("항공권 알림 메일 발송에 실패했습니다. memberId={}", event.memberId(), e);
		}
	}

	private String buildMessage(FlightAlertCreatedEvent event) {
		return """
			항공권 가격 알림이 도착했습니다.

			도시: %s
			설정가: %d원
			발견가: %d원
			가장 가까운 날짜: %s
			가장 싼 날짜: %s
			조건 만족 날짜 수: %d개
			""".formatted(
			event.cityName(),
			event.thresholdPrice(),
			event.matchedPrice(),
			event.nearestMatchDate(),
			event.bestPriceDate(),
			event.matchedDateCount()
		);
	}
}
