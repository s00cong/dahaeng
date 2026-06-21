package com.example.dahaeng.domain.flightalert.dto;

import java.io.Serializable;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 항공권 알림 이메일 발송 메시지
 * 알림 생성 후 이메일 발송을 위한 메시지
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlightAlertEmailMessage implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long notificationId;
    private Long memberId;
    private String email;
    private String cityName;
    private Integer thresholdPrice;
    private Integer matchedPrice;
    private LocalDate nearestMatchDate;
    private LocalDate bestPriceDate;
    private Long matchedDateCount;

    public FlightAlertEmailMessage(Long memberId, String email, String cityName, Integer thresholdPrice,
            Integer matchedPrice, LocalDate nearestMatchDate, LocalDate bestPriceDate, Long matchedDateCount) {
        this.memberId = memberId;
        this.email = email;
        this.cityName = cityName;
        this.thresholdPrice = thresholdPrice;
        this.matchedPrice = matchedPrice;
        this.nearestMatchDate = nearestMatchDate;
        this.bestPriceDate = bestPriceDate;
        this.matchedDateCount = matchedDateCount;
    }
}
