package com.example.dahaeng.domain.flightalert.service;

import java.time.LocalDateTime;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.flightalert.dto.FlightAlertEvaluationMessage;
import com.example.dahaeng.domain.flightalert.dto.FlightAlertEmailMessage;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertNotification;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertNotificationRepository;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;
import com.example.dahaeng.global.config.RabbitMQConfig;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 항공권 알림 평가 워커 서비스
 * 
 * 개별 구독에 대한 가격 평가를 담당합니다.
 * 기존 FlightAlertBatchService의 로직을 분리한 것입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class FlightAlertEvaluationWorkerService {
    private final FlightAlertSubscriptionRepository subscriptionRepository;
    private final FlightAlertNotificationRepository notificationRepository;
    private final FlightAlertPriceService priceService;
    private final RabbitTemplate rabbitTemplate;

    /**
     * 개별 구독에 대해 가격을 평가하고 알림을 생성합니다.
     * 
     * @param message 평가 대상 구독 정보
     */
    public void evaluateSubscription(FlightAlertEvaluationMessage message) {
        try {
            // DB에서 구독 정보 조회
            FlightAlertSubscription subscription = subscriptionRepository
                .findById(message.getSubscriptionId())
                .orElseThrow(() -> new RuntimeException("구독을 찾을 수 없습니다: " + message.getSubscriptionId()));

            // 가격 매칭
            priceService.findAlertCandidate(message.getCityId(), message.getThresholdPrice())
                .ifPresent(match -> {
                    // 마지막 알림 가격보다 높으면 스킵
                    if (subscription.getLastNotifiedPrice() != null && 
                        match.matchedPrice() >= subscription.getLastNotifiedPrice()) {
                        log.debug("구독 {}는 이미 알림했던 가격입니다. lastNotified={}, matched={}",
                            message.getSubscriptionId(), subscription.getLastNotifiedPrice(), 
                            match.matchedPrice());
                        return;
                    }

                    // 알림 엔티티 생성
                    FlightAlertNotification notification = FlightAlertNotification.builder()
                        .subscription(subscription)
                        .alertType(match.alertType())
                        .thresholdPrice(subscription.getThresholdPrice())
                        .matchedPrice(match.matchedPrice())
                        .nearestMatchDate(match.nearestMatchDate())
                        .bestPriceDate(match.bestPriceDate())
                        .matchedDateCount(match.matchedDateCount())
                        .collectedAt(match.collectedAt())
                        .build();

                    notificationRepository.save(notification);
                    subscription.updateLastNotification(match.matchedPrice(), LocalDateTime.now());

                    log.info("구독 {}에 대한 알림을 생성했습니다. matchedPrice={}, subscriptionId={}",
                        message.getSubscriptionId(), match.matchedPrice(), message.getSubscriptionId());

                    // 이메일 알림 활성화 시 메시지 발행
                    if (message.isEmailAlertEnabled()) {
                        publishEmailMessage(notification, message);
                    }
                });

        } catch (Exception e) {
            log.error("구독 평가 중 오류 발생: subscriptionId={}", message.getSubscriptionId(), e);
            throw e;
        }
    }

    /**
     * 이메일 발송 메시지를 RabbitMQ로 발행합니다.
     * 
     * @param notification 생성된 알림
     * @param evalMessage 평가 메시지
     */
    private void publishEmailMessage(FlightAlertNotification notification, 
                                      FlightAlertEvaluationMessage evalMessage) {
        try {
            FlightAlertEmailMessage emailMessage = FlightAlertEmailMessage.builder()
                .notificationId(notification.getId())
                .memberId(evalMessage.getMemberId())
                .email(evalMessage.getMemberEmail())
                .cityName(notification.getSubscription().getCity().getCityName())
                .thresholdPrice(notification.getThresholdPrice())
                .matchedPrice(notification.getMatchedPrice())
                .nearestMatchDate(notification.getNearestMatchDate())
                .bestPriceDate(notification.getBestPriceDate())
                .matchedDateCount(notification.getMatchedDateCount())
                .build();

            rabbitTemplate.convertAndSend(
                RabbitMQConfig.FLIGHT_ALERT_EXCHANGE,
                RabbitMQConfig.FLIGHT_ALERT_EMAIL_ROUTING_KEY,
                emailMessage
            );

            log.info("이메일 메시지를 큐에 발행했습니다. notificationId={}, email={}",
                notification.getId(), evalMessage.getMemberEmail());
        } catch (Exception e) {
            log.error("이메일 메시지 발행 실패: notificationId={}, email={}",
                notification.getId(), evalMessage.getMemberEmail(), e);
            // 이메일 큐 발행 실패는 비즈니스 로직 실패로 처리하지 않음
            // (알림은 이미 생성되었으므로)
        }
    }
}
