package com.example.dahaeng.domain.exchange.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;

public interface ExchangeRepository extends JpaRepository<Exchange, Long> {
	Optional<Exchange> findFirstByCurrencyOrderByEventDateDesc(Currency currency);

	@Query("""
        select e
        from Exchange e
        where e.currency = :currency
          and e.eventDate between :startDate and :endDate
        order by e.eventDate asc
    """)
	List<Exchange> findByCurrencyAndEventDateBetween(
		@Param("currency") Currency currency,
		@Param("startDate") LocalDate startDate,
		@Param("endDate") LocalDate endDate
	);
}
