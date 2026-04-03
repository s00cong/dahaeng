package com.example.dahaeng.domain.flightalert.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
			jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setTo(event.email());
			helper.setSubject("[다행] " + event.cityName() + " 항공권 가격 알림");
			helper.setText(buildHtmlMessage(event), true);
			helper.addInline(
				"flight-alert-logo",
				new ClassPathResource("mail/logo_remove_background.png"),
				"image/png"
			);
			mailSender.send(message);
		} catch (Exception e) {
			log.warn("항공권 알림 메일 발송에 실패했습니다. memberId={}", event.memberId(), e);
		}
	}

	private String buildHtmlMessage(FlightAlertCreatedEvent event) {
		return """
			<html>
			  <body style="margin:0;padding:0;background-color:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937;">
			    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
			      <div style="position:relative;overflow:hidden;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
			        <img src="cid:flight-alert-logo" alt="다행 로고" style="position:absolute;right:8px;bottom:8px;width:260px;height:auto;opacity:1;pointer-events:none;" />
			        <div style="position:relative;z-index:1;">
			          <h2 style="margin:0 0 16px;font-size:20px;">항공권 가격 알림이 도착했습니다.</h2>
			          <p style="margin:0 0 10px;">도시: <strong>%s</strong></p>
			          <p style="margin:0 0 10px;">설정가: <strong>%d원</strong></p>
			          <p style="margin:0 0 10px;">발견가: <strong>%d원</strong></p>
			          <p style="margin:0 0 10px;">가장 가까운 날짜: <strong>%s</strong></p>
			          <p style="margin:0 0 10px;">가장 저렴한 날짜: <strong>%s</strong></p>
			          <p style="margin:0;">조건 만족 날짜 수: <strong>%d개</strong></p>
			        </div>
			      </div>
			    </div>
			  </body>
			</html>
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
