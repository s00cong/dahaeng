package com.example.dahaeng.domain.flightalert.dto;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 구독별 항공권 알림 평가 메시지
 * Flight Alert 배치에서 각 구독을 평가하기 위한 메시지
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlightAlertEvaluationMessage implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long subscriptionId;
    private Long cityId;
    private Integer thresholdPrice;
    private Long memberId;
    private String memberEmail;
    private boolean emailAlertEnabled;

    public FlightAlertEvaluationMessage(Long subscriptionId, Long cityId, Integer thresholdPrice, 
            Long memberId, String memberEmail, boolean emailAlertEnabled) {
        this.subscriptionId = subscriptionId;
        this.cityId = cityId;
        this.thresholdPrice = thresholdPrice;
        this.memberId = memberId;
        this.memberEmail = memberEmail;
        this.emailAlertEnabled = emailAlertEnabled;
    }
}
