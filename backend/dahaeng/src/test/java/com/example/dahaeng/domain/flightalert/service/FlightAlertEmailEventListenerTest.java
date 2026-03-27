package com.example.dahaeng.domain.flightalert.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import com.example.dahaeng.domain.flightalert.event.FlightAlertCreatedEvent;

@ExtendWith(MockitoExtension.class)
class FlightAlertEmailEventListenerTest {

	@Mock
	private JavaMailSender mailSender;

	@InjectMocks
	private FlightAlertEmailEventListener emailEventListener;

	@Test
	void handleFlightAlertCreatedSendsMail() {
		emailEventListener.handleFlightAlertCreated(event());

		ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(mailSender).send(messageCaptor.capture());
		SimpleMailMessage message = messageCaptor.getValue();
		org.assertj.core.api.Assertions.assertThat(message.getTo()).containsExactly("test@example.com");
		org.assertj.core.api.Assertions.assertThat(message.getSubject()).contains("Tokyo");
		org.assertj.core.api.Assertions.assertThat(message.getText()).contains("설정가: 350000원");
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
}
