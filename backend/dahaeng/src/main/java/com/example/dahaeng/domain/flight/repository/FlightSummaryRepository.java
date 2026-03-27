package com.example.dahaeng.domain.flight.repository;

import com.example.dahaeng.domain.flight.entity.FlightSummary;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlightSummaryRepository extends JpaRepository<FlightSummary, Long> {

    // API 2: 6개월 추이 조회 (당월 기준 상위 6개)
    List<FlightSummary> findByCityIdAndYearMonthGreaterThanEqualOrderByYearMonthAsc(Long cityId, String yearMonth,
            Pageable pageable);

    // API 3: 도시 요약 단건 조회 (City와 Fetch Join)
    @Query("SELECT fs FROM FlightSummary fs JOIN FETCH fs.city WHERE fs.city.id = :cityId AND fs.yearMonth = :yearMonth")
    Optional<FlightSummary> findByCityIdAndYearMonthWithCity(@Param("cityId") Long cityId,
            @Param("yearMonth") String yearMonth);

    @Query("""
            select fs
            from FlightSummary fs
            join fetch fs.city
            where fs.yearMonth = :yearMonth
              and fs.city.id in :cityIds
            """)
    List<FlightSummary> findAllByYearMonthAndCityIdsWithCity(
            @Param("yearMonth") String yearMonth,
            @Param("cityIds") List<Long> cityIds
    );

}
