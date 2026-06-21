package com.example.dahaeng.domain.flightalert.consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.example.dahaeng.domain.flightalert.dto.FlightAlertEmailMessage;
import com.example.dahaeng.domain.flightalert.service.FlightAlertEmailWorkerService;
import com.example.dahaeng.global.config.RabbitMQConfig;

import lombok.RequiredArgsConstructor;

/**
 * 항공권 알림 이메일 발송 컨슈머
 * 
 * flight-alert-email 큐에서 메시지를 받아 비동기로 이메일을 발송합니다.
 * 이를 통해 알림 생성과 이메일 발송을 완전히 분리할 수 있습니다.
 */
@Component
@RequiredArgsConstructor
public class FlightAlertEmailConsumer {
    private static final Logger log = LoggerFactory.getLogger(FlightAlertEmailConsumer.class);

    private final FlightAlertEmailWorkerService emailWorkerService;

    @RabbitListener(queues = RabbitMQConfig.FLIGHT_ALERT_EMAIL_QUEUE, concurrency = "2-5")
    public void sendFlightAlertEmail(FlightAlertEmailMessage message) {
        try {
            log.info("항공권 알림 이메일 발송 시작: notificationId={}, memberId={}, email={}",
                message.getNotificationId(), message.getMemberId(), message.getEmail());

            emailWorkerService.sendAlertEmail(message);

            log.info("항공권 알림 이메일 발송 완료: notificationId={}", message.getNotificationId());
        } catch (Exception e) {
            log.error("항공권 알림 이메일 발송 중 오류 발생: notificationId={}, email={}",
                message.getNotificationId(), message.getEmail(), e);
            // 예외 발생 시 재시도 또는 Dead Letter Queue로 이동
            throw new RuntimeException("Failed to send flight alert email", e);
        }
    }
}
