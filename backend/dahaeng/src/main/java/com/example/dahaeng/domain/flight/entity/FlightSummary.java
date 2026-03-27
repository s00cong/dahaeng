package com.example.dahaeng.domain.flight.entity;

import com.example.dahaeng.domain.city.entity.City;
import jakarta.persistence.*;
import com.example.dahaeng.global.entity.BaseEntity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "flight_summary", uniqueConstraints = {
        @UniqueConstraint(name = "uk_city_year_month", columnNames = { "city_id", "target_year_month" })
})
public class FlightSummary extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id")
    private City city;

    @Column(name = "target_year_month")
    private String yearMonth;

    @Column(name = "origin_airport")
    private String originAirport;

    @Column(name = "avg_flight_price")
    private Integer avgFlightPrice;

    @Column(name = "avg_hotel_price")
    private Integer avgHotelPrice;

    @Column(name = "stops")
    private Integer stops;

    @Column(name = "flight_duration")
    private Integer flightDuration;

    @Column(name = "peak_month_list")
    private String peakMonthList;

    @Column(name = "off_month_list")
    private String offMonthList;

    @Column(name = "flight_collected_date")
    private LocalDateTime flightCollectedDate;

    @Column(name = "hotel_collected_date")
    private LocalDateTime hotelCollectedDate;

}
