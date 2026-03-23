package com.example.dahaeng.domain.flight.repository;

import com.example.dahaeng.domain.flight.document.FlightPriceCalendar;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlightPriceCalendarRepository extends MongoRepository<FlightPriceCalendar, String> {

    // API 1: 캘린더 조회를 위해 특정 월의 최근 수집 문서 15개 조회
    List<FlightPriceCalendar> findByCityIdAndYearMonthOrderByCollectedDateDesc(Long cityId, String yearMonth,
            Pageable pageable);
}
