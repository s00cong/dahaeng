package com.example.dahaeng.domain.flightalert.service;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.flightalert.dto.FlightAlertEvaluationMessage;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;
import com.example.dahaeng.global.config.RabbitMQConfig;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 항공권 알림 배치 서비스
 * 
 * RabbitMQ를 이용한 메시지 기반 배치 처리:
 * - 모든 활성 구독을 조회하여 각 구독별 평가 메시지를 큐에 발행
 * - 각 메시지는 FlightAlertEvaluationConsumer가 비동기로 처리
 * - 병렬 처리를 통해 배치 성능 향상
 * 
 * 이전 동기 방식 (FlightAlertBatchService의 evaluateActiveSubscriptions):
 * - 모든 구독을 순회하면서 동기로 처리
 * - 한 구독 실패 시 나머지 처리에 영향
 * - 구독이 많을수록 배치 시간 증가
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class FlightAlertBatchService {
	private final FlightAlertSubscriptionRepository subscriptionRepository;
	private final RabbitTemplate rabbitTemplate;

	/**
	 * 모든 활성 구독에 대한 평가 메시지를 RabbitMQ로 발행합니다.
	 * 
	 * 각 구독마다 FlightAlertEvaluationMessage를 생성하여 큐에 발행하고,
	 * FlightAlertEvaluationConsumer가 병렬로 처리합니다.
	 */
	public void evaluateActiveSubscriptions() {
		log.info("항공권 알림 배치 시작 - 활성 구독 메시지 발행");
		
		int totalCount = 0;
		int publishedCount = 0;
		
		try {
			for (FlightAlertSubscription subscription : subscriptionRepository.findAllByEnabledTrueAndIsDeletedFalse()) {
				totalCount++;
				try {
					// 각 구독에 대한 평가 메시지 생성
					FlightAlertEvaluationMessage message = FlightAlertEvaluationMessage.builder()
						.subscriptionId(subscription.getId())
						.cityId(subscription.getCity().getId())
						.thresholdPrice(subscription.getThresholdPrice())
						.memberId(subscription.getMember().getId())
						.memberEmail(subscription.getMember().getEmail())
						.emailAlertEnabled(subscription.getMember().isEmailAlertEnabled())
						.build();

					// 메시지를 RabbitMQ로 발행
					rabbitTemplate.convertAndSend(
						RabbitMQConfig.FLIGHT_ALERT_EXCHANGE,
						RabbitMQConfig.FLIGHT_ALERT_EVAL_ROUTING_KEY,
						message
					);
					
					publishedCount++;
					
				} catch (Exception e) {
					log.error("구독 평가 메시지 발행 실패: subscriptionId={}", subscription.getId(), e);
					// 한 구독의 메시지 발행 실패해도 나머지 구독은 계속 처리
				}
			}
			
			log.info("항공권 알림 배치 완료 - 발행된 메시지: {}/{}", publishedCount, totalCount);
			
		} catch (Exception e) {
			log.error("항공권 알림 배치 중 오류 발생", e);
			throw e;
		}
	}
}
