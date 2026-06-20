package com.example.dahaeng.domain.flightalert.consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.example.dahaeng.domain.flightalert.dto.FlightAlertEvaluationMessage;
import com.example.dahaeng.domain.flightalert.service.FlightAlertEvaluationWorkerService;
import com.example.dahaeng.global.config.RabbitMQConfig;

import lombok.RequiredArgsConstructor;

/**
 * 항공권 알림 평가 컨슈머
 * 
 * flight-alert-eval 큐에서 메시지를 받아 구독별 가격 평가를 수행합니다.
 * 이를 통해 배치의 병렬 처리가 가능해집니다.
 */
@Component
@RequiredArgsConstructor
public class FlightAlertEvaluationConsumer {
    private static final Logger log = LoggerFactory.getLogger(FlightAlertEvaluationConsumer.class);

    private final FlightAlertEvaluationWorkerService evaluationWorkerService;

    @RabbitListener(queues = RabbitMQConfig.FLIGHT_ALERT_EVAL_QUEUE, concurrency = "5-10")
    public void evaluateFlightAlert(FlightAlertEvaluationMessage message) {
        try {
            log.info("항공권 알림 평가 시작: subscriptionId={}, cityId={}, thresholdPrice={}",
                message.getSubscriptionId(), message.getCityId(), message.getThresholdPrice());

            evaluationWorkerService.evaluateSubscription(message);

            log.info("항공권 알림 평가 완료: subscriptionId={}", message.getSubscriptionId());
        } catch (Exception e) {
            log.error("항공권 알림 평가 중 오류 발생: subscriptionId={}", message.getSubscriptionId(), e);
            // 예외 발생 시 RabbitMQ의 재시도 정책이 적용됨 (또는 Dead Letter Queue로 이동)
            throw new RuntimeException("Failed to evaluate flight alert", e);
        }
    }
}
