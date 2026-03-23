package com.example.dahaeng.domain.exchange.repository;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.util.List;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;

import jakarta.transaction.Transactional;

@SpringBootTest
@Transactional
class ExchangeRepositoryTest {
	@Autowired
	ExchangeRepository repository;

	@Test
	void findOne() {
		// given: 테스트용 데이터 생성
		LocalDate eventDate = LocalDate.parse("2026-03-09");
		Exchange sample = Exchange.builder()
				.currency(Currency.USD)
				.eventDate(eventDate)
				.krwPer1cur(1300.0)
				.build();
		repository.save(sample);

		// when
		Exchange exchange = repository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD).orElseThrow();

		// then
		Assertions.assertThat(exchange.getEventDate()).isEqualTo(eventDate);
	}
}