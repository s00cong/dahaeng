package com.example.dahaeng.domain.flightalert.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;

import jakarta.mail.internet.MimeMessage;

class FlightAlertEmailManualSendTest {

	@Test
	void sendManualHtmlMailWithInlineLogo() throws Exception {
		String host = requireEnv("MAIL_HOST");
		int port = Integer.parseInt(requireEnv("MAIL_PORT"));
		String username = requireEnv("MAIL_USERNAME");
		String password = requireEnv("MAIL_PASSWORD");
		String recipient = requireEnv("MAIL_TEST_RECIPIENT");

		JavaMailSenderImpl sender = new JavaMailSenderImpl();
		sender.setHost(host);
		sender.setPort(port);
		sender.setUsername(username);
		sender.setPassword(password);

		java.util.Properties properties = sender.getJavaMailProperties();
		properties.put("mail.smtp.auth", "true");
		properties.put("mail.smtp.starttls.enable", "true");

		MimeMessage message = sender.createMimeMessage();
		MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
		helper.setTo(recipient);
		helper.setFrom(username);
		helper.setSubject("[다행] 로고 포함 메일 테스트");
		helper.setText(
			"""
				<html>
				  <body style="margin:0;padding:0;background-color:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937;">
				    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
				      <div style="position:relative;overflow:hidden;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
				        <img src="cid:flight-alert-logo" alt="다행 로고" style="position:absolute;right:8px;bottom:8px;width:260px;height:auto;opacity:1;pointer-events:none;" />
				        <div style="position:relative;z-index:1;">
				          <h2 style="margin:0 0 16px;font-size:20px;">항공권 가격 알림 메일 테스트입니다.</h2>
				          <p style="margin:0 0 10px;">도시: <strong>Tokyo</strong></p>
				          <p style="margin:0 0 10px;">설정가: <strong>350000원</strong></p>
				          <p style="margin:0 0 10px;">발견가: <strong>328000원</strong></p>
				          <p style="margin:0 0 10px;">가장 가까운 날짜: <strong>%s</strong></p>
				          <p style="margin:0 0 10px;">가장 저렴한 날짜: <strong>%s</strong></p>
				          <p style="margin:0;">조건 만족 날짜 수: <strong>3개</strong></p>
				        </div>
				      </div>
				    </div>
				  </body>
				</html>
				""".formatted(LocalDate.parse("2026-04-12"), LocalDate.parse("2026-05-14")),
			true
		);
		helper.addInline(
			"flight-alert-logo",
			new ClassPathResource("mail/logo_remove_background.png"),
			"image/png"
		);

		sender.send(message);
		assertThat(true).isTrue();
	}

	private static String requireEnv(String name) {
		String value = System.getenv(name);
		assertThat(value)
			.as("Environment variable %s must be set", name)
			.isNotBlank();
		return value;
	}
}
