package com.example.dahaeng.domain.flightalert.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.example.dahaeng.domain.flightalert.dto.FlightAlertEmailMessage;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 항공권 알림 이메일 발송 워커 서비스
 * 
 * RabbitMQ 컨슈머로부터 받은 메시지를 바탕으로 이메일을 발송합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FlightAlertEmailWorkerService {
    private final JavaMailSender mailSender;

    /**
     * 항공권 알림 이메일을 발송합니다.
     * 
     * @param message 이메일 발송 메시지
     */
    public void sendAlertEmail(FlightAlertEmailMessage message) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setTo(message.getEmail());
            helper.setSubject("[다행] " + message.getCityName() + " 항공권 가격 알림");
            helper.setText(buildHtmlMessage(message), true);
            
            // 로고 인라인 추가
            helper.addInline(
                "flight-alert-logo",
                new ClassPathResource("mail/logo_remove_background.png"),
                "image/png"
            );

            mailSender.send(mimeMessage);

            log.info("항공권 알림 이메일 발송 성공: memberId={}, email={}, cityName={}",
                message.getMemberId(), message.getEmail(), message.getCityName());

        } catch (Exception e) {
            log.error("항공권 알림 이메일 발송 실패: notificationId={}, memberId={}, email={}",
                message.getNotificationId(), message.getMemberId(), message.getEmail(), e);
            throw new RuntimeException("Failed to send flight alert email", e);
        }
    }

    /**
     * 이메일 HTML 본문을 생성합니다.
     * 
     * @param message 이메일 메시지
     * @return HTML 형식의 이메일 본문
     */
    private String buildHtmlMessage(FlightAlertEmailMessage message) {
        return """
            <html>
              <body style="margin:0;padding:0;background-color:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937;">
                <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
                  <div style="position:relative;overflow:hidden;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
                    <img src="cid:flight-alert-logo" alt="다행 로고" style="position:absolute;right:8px;bottom:8px;width:260px;height:auto;opacity:1;pointer-events:none;" />
                    <div style="position:relative;z-index:1;">
                      <h2 style="margin:0 0 16px;font-size:20px;">항공권 가격 알림이 도착했습니다.</h2>
                      <p style="margin:0 0 10px;">도시: <strong>%s</strong></p>
                      <p style="margin:0 0 10px;">설정가: <strong>%d원</strong></p>
                      <p style="margin:0 0 10px;">발견가: <strong>%d원</strong></p>
                      <p style="margin:0 0 10px;">가장 가까운 날짜: <strong>%s</strong></p>
                      <p style="margin:0 0 10px;">가장 저렴한 날짜: <strong>%s</strong></p>
                      <p style="margin:0;">조건 만족 날짜 수: <strong>%d개</strong></p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
            """.formatted(
                message.getCityName(),
                message.getThresholdPrice(),
                message.getMatchedPrice(),
                message.getNearestMatchDate(),
                message.getBestPriceDate(),
                message.getMatchedDateCount()
            );
    }
}
