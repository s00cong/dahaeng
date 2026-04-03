package com.example.dahaeng.domain.flightalert.service;

import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;

import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import com.example.dahaeng.domain.flightalert.event.FlightAlertCreatedEvent;

@ExtendWith(MockitoExtension.class)
class FlightAlertEmailEventListenerTest {

	@Mock
	private JavaMailSender mailSender;

	@InjectMocks
	private FlightAlertEmailEventListener emailEventListener;

	@Test
	void handleFlightAlertCreatedSendsHtmlMailWithInlineLogo() throws Exception {
		MimeMessage mimeMessage = new MimeMessage((Session)null);
		doReturn(mimeMessage).when(mailSender).createMimeMessage();

		emailEventListener.handleFlightAlertCreated(event());

		ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
		verify(mailSender).send(messageCaptor.capture());
		MimeMessage message = messageCaptor.getValue();
		message.saveChanges();
		org.assertj.core.api.Assertions.assertThat(message.getAllRecipients()).hasSize(1);
		org.assertj.core.api.Assertions.assertThat(message.getAllRecipients()[0].toString()).isEqualTo("test@example.com");
		org.assertj.core.api.Assertions.assertThat(message.getSubject()).contains("Tokyo");
		String htmlBody = findHtmlBody(message);
		org.assertj.core.api.Assertions.assertThat(htmlBody).contains("Tokyo");
		org.assertj.core.api.Assertions.assertThat(htmlBody).contains("cid:flight-alert-logo");
		org.assertj.core.api.Assertions.assertThat(htmlBody).contains("position:absolute");
		org.assertj.core.api.Assertions.assertThat(htmlBody).contains("opacity:1");
		org.assertj.core.api.Assertions.assertThat(htmlBody).contains("width:260px");
		org.assertj.core.api.Assertions.assertThat(findInlineLogoPart(message)).isNotNull();
	}

	private static FlightAlertCreatedEvent event() {
		return new FlightAlertCreatedEvent(
			1L,
			"test@example.com",
			"Tokyo",
			350_000,
			328_000,
			LocalDate.parse("2026-04-12"),
			LocalDate.parse("2026-05-14"),
			3
		);
	}

	private static String findHtmlBody(Part part) throws Exception {
		if (part.isMimeType("text/html")) {
			return part.getContent().toString();
		}
		if (part.isMimeType("multipart/*")) {
			Multipart multipart = (Multipart)part.getContent();
			for (int index = 0; index < multipart.getCount(); index++) {
				String html = findHtmlBody(multipart.getBodyPart(index));
				if (html != null) {
					return html;
				}
			}
		}
		return null;
	}

	private static BodyPart findInlineLogoPart(Part part) throws Exception {
		if (part.isMimeType("multipart/*")) {
			Multipart multipart = (Multipart)part.getContent();
			for (int index = 0; index < multipart.getCount(); index++) {
				BodyPart bodyPart = multipart.getBodyPart(index);
				String[] contentIds = bodyPart.getHeader("Content-ID");
				if (contentIds != null) {
					for (String contentId : contentIds) {
						if (contentId.contains("flight-alert-logo")) {
							return bodyPart;
						}
					}
				}
				BodyPart nested = findInlineLogoPart(bodyPart);
				if (nested != null) {
					return nested;
				}
			}
		}
		return null;
	}
}
