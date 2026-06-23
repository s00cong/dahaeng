# 다행 프로젝트 RabbitMQ 적용 가이드

## 📋 개요

다행 프로젝트의 **항공권 알림 배치**에 RabbitMQ를 적용하여 다음을 달성했습니다:

- **배치 병렬화**: 모든 구독을 동기로 처리하던 방식 → 각 구독을 비동기 메시지로 처리
- **느슨한 결합**: 알림 생성과 이메일 발송을 완전히 분리
- **장애 격리**: 한 구독 처리 실패가 다른 구독에 영향 없음
- **확장성**: 컨슈머 수 조정으로 처리량 제어 가능

---

## 🏗️ 아키텍처

### 이전 (동기 방식)
```
FlightAlertScheduler (9시 실행)
  ↓
evaluateActiveSubscriptions() (동기)
  ├─ for 구독1: 가격 조회 → 알림 생성 → 이벤트 발행 → 이메일 발송
  ├─ for 구독2: ...
  └─ for 구독N: ...
```

**문제점:**
- 구독이 많으면 배치 시간이 선형으로 증가
- 한 구독 처리 실패 시 이후 구독 처리에 영향
- 배치와 이메일 발송이 같은 스레드에서 처리

### 이후 (비동기 메시지 큐 방식)
```
FlightAlertScheduler (9시 실행)
  ↓
evaluateActiveSubscriptions()
  └─ 모든 구독 ID를 "flight-alert-eval" 큐에 발행 (빠름)
       ↓
  [RabbitMQ 큐]
       ↓
  FlightAlertEvaluationConsumer (병렬 처리, 5-10개 동시)
  ├─ [Worker 1] 구독1 처리 → 알림 생성
  ├─ [Worker 2] 구독2 처리 → 알림 생성
  └─ [Worker N] 구독N 처리 → 알림 생성
       ↓
  각 알림마다 이메일 메시지를 "flight-alert-email" 큐에 발행
       ↓
  [RabbitMQ 큐]
       ↓
  FlightAlertEmailConsumer (병렬 처리, 2-5개 동시)
  ├─ [Worker 1] 이메일 발송
  ├─ [Worker 2] 이메일 발송
  └─ [Worker N] 이메일 발송
```

**장점:**
- 배치는 메시지 발행만 수행 (시간 단축)
- 각 구독 처리가 독립적
- 이메일 발송을 별도로 확장 가능
- 실패한 메시지는 재시도 또는 Dead Letter Queue로 이동

---

## 📦 구현 파일

### 1. 설정 파일

#### `global/config/RabbitMQConfig.java`
- **역할**: RabbitMQ 큐, Exchange, Binding 정의
- **구성**:
  - `flight-alert-eval`: 구독 평가 메시지 큐
  - `flight-alert-email`: 이메일 발송 메시지 큐
  - Dead Letter Queues (DLQ) 설정
  - Jackson 메시지 변환기

#### `application-example.yml` (RabbitMQ 섹션)
```yaml
spring:
  rabbitmq:
    host: ${RABBITMQ_HOST:localhost}
    port: ${RABBITMQ_PORT:5672}
    username: ${RABBITMQ_USERNAME:guest}
    password: ${RABBITMQ_PASSWORD:guest}
    virtual-host: ${RABBITMQ_VIRTUAL_HOST:/}
    listener:
      simple:
        acknowledge-mode: AUTO
        max-concurrency: 10        # 동시 처리 워커 수
        prefetch: 1               # 한 번에 가져올 메시지 수
```

### 2. Message DTO

#### `domain/flightalert/dto/FlightAlertEvaluationMessage.java`
- **용도**: 구독 평가 메시지
- **필드**:
  - `subscriptionId`: 대상 구독 ID
  - `cityId`: 도시 ID
  - `thresholdPrice`: 가격 임계값
  - `memberId`, `memberEmail`: 회원 정보
  - `emailAlertEnabled`: 이메일 알림 활성화 여부

#### `domain/flightalert/dto/FlightAlertEmailMessage.java`
- **용도**: 이메일 발송 메시지
- **필드**:
  - `notificationId`: 알림 ID
  - `email`, `memberId`: 수신자 정보
  - 알림 내용: 도시명, 가격, 날짜 등

### 3. 컨슈머 (Consumer)

#### `domain/flightalert/consumer/FlightAlertEvaluationConsumer.java`
```java
@RabbitListener(queues = "flight-alert-eval", concurrency = "5-10")
public void evaluateFlightAlert(FlightAlertEvaluationMessage message) {
    // 개별 구독 평가
    evaluationWorkerService.evaluateSubscription(message);
}
```

- **동시성**: 5~10개 워커 병렬 처리
- **에러 처리**: 예외 발생 시 메시지는 재시도 큐로 이동

#### `domain/flightalert/consumer/FlightAlertEmailConsumer.java`
```java
@RabbitListener(queues = "flight-alert-email", concurrency = "2-5")
public void sendFlightAlertEmail(FlightAlertEmailMessage message) {
    // 이메일 발송
    emailWorkerService.sendAlertEmail(message);
}
```

- **동시성**: 2~5개 워커 병렬 처리
- **속도**: 이메일 발송은 I/O 중심이므로 적은 워커로도 충분

### 4. 워커 서비스 (Worker Service)

#### `domain/flightalert/service/FlightAlertEvaluationWorkerService.java`
- **역할**: 개별 구독 평가 로직 수행
- **프로세스**:
  1. 구독 정보 조회
  2. 가격 매칭 (기존 로직 재사용)
  3. 알림 엔티티 생성
  4. 마지막 알림 가격 업데이트
  5. 이메일 알림 활성화 시 이메일 메시지 발행

#### `domain/flightalert/service/FlightAlertEmailWorkerService.java`
- **역할**: 이메일 발송 로직 수행
- **프로세스**:
  1. MIME 메시지 생성
  2. 수신자, 제목, 본문 설정
  3. 로고 이미지 인라인 추가
  4. 이메일 발송

### 5. 배치 서비스 (수정됨)

#### `domain/flightalert/service/FlightAlertBatchService.java`
**변경 사항**: 동기 처리 → 메시지 발행

**이전**:
```java
public void evaluateActiveSubscriptions() {
    for (subscription : getAllActiveSubscriptions()) {
        // 동기로 처리
        priceService.findAlertCandidate(...)
        notificationRepository.save(...)
        applicationEventPublisher.publishEvent(...)
    }
}
```

**현재**:
```java
public void evaluateActiveSubscriptions() {
    for (subscription : getAllActiveSubscriptions()) {
        // 메시지로 발행만 수행
        FlightAlertEvaluationMessage message = 
            FlightAlertEvaluationMessage.builder()...build();
        
        rabbitTemplate.convertAndSend(
            FLIGHT_ALERT_EXCHANGE,
            FLIGHT_ALERT_EVAL_ROUTING_KEY,
            message
        );
    }
}
```

---

## 🚀 배포 설정

### Docker Compose 구성

#### `deploy/app/docker-compose.yml`
RabbitMQ 서비스 추가:
```yaml
services:
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"       # AMQP
      - "15672:15672"     # Management UI (http://localhost:15672)
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]

  backend:
    depends_on:
      rabbitmq:
        condition: service_healthy
    environment:
      RABBITMQ_HOST: rabbitmq
```

#### `.env.example`
```env
# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VIRTUAL_HOST=/
RABBITMQ_MAX_CONCURRENCY=10
RABBITMQ_PREFETCH=1
```

---

## 📊 성능 비교

### 구독 100개 기준 (가정)
| 구분 | 이전 (동기) | 이후 (비동기) |
|------|-----------|-----------|
| 배치 발행 시간 | ~30초 | ~1초 |
| 총 평가 시간 | ~30초 | ~3초 (워커 10개 병렬) |
| 이메일 발송 | 배치 완료 후 순차 | 동시 진행 |
| 메모리 사용 | 모든 구독 로드 | 메시지 단위 처리 |
| 실패 영향도 | 이후 구독 처리 불가 | 해당 구독만 실패 |

---

## 🔧 RabbitMQ 관리 UI

RabbitMQ Management 콘솔:
- **URL**: http://localhost:15672
- **기본 계정**: guest / guest
- **확인 항목**:
  - Queues: `flight-alert-eval`, `flight-alert-email` 메시지 수
  - Connections: 백엔드 연결 상태
  - Channels: 메시지 발행/소비 채널
  - Admin: 큐 삭제, 메시지 정리 등

---

## 🛠️ 로컬 실행

### 1. 의존성 설치
```bash
cd backend/dahaeng
./gradlew build
```

### 2. 환경 변수 설정
```bash
cp deploy/app/.env.example deploy/app/.env
# .env 파일에서 RabbitMQ 설정 확인
```

### 3. Docker Compose 실행
```bash
cd deploy/app
docker-compose up -d
```

### 4. 로그 확인
```bash
docker-compose logs -f backend
# RabbitMQ 연결 확인
```

### 5. 배치 수동 실행 (선택)
```bash
curl -X POST http://localhost:8080/api/flight-alert/batch/evaluate \
  -H "Authorization: Bearer {internal-token}" \
  -H "Content-Type: application/json"
```

---

## 🐛 트러블슈팅

### RabbitMQ 연결 실패
```
Error connecting to RabbitMQ at localhost:5672
```
**해결**:
1. RabbitMQ 컨테이너 실행 확인: `docker ps | grep rabbitmq`
2. 컨테이너 로그 확인: `docker logs dahaeng-rabbitmq`
3. 포트 충돌 확인: `lsof -i :5672`

### 메시지가 큐에 쌓이고 처리되지 않음
```
Queue [flight-alert-eval] has X messages waiting
```
**해결**:
1. 컨슈머 실행 확인: `docker logs -f dahaeng-backend | grep "RabbitListener"`
2. 에러 로그 확인: `docker logs dahaeng-backend | grep ERROR`
3. RabbitMQ 관리 UI에서 consumers 확인
4. 동시성 설정 증가: `RABBITMQ_MAX_CONCURRENCY=20`

### 이메일이 발송되지 않음
```
FlightAlertEmailConsumer: 항공권 알림 이메일 발송 시작
```
**해결**:
1. 이메일 서비스 설정 확인 (application.yml의 `spring.mail`)
2. SMTP 인증 설정 확인
3. 발신자 이메일 주소 확인

---

## 📈 향후 개선 사항

### 1. 모니터링 추가
```java
@Component
public class RabbitMQMetrics {
    @Scheduled(fixedRate = 60000)
    public void publishMetrics() {
        // 큐 깊이, 처리 시간, 에러율 수집
    }
}
```

### 2. Dead Letter Queue 처리
```yaml
spring:
  rabbitmq:
    listener:
      simple:
        retry:
          enabled: true
          max-attempts: 3
          initial-interval: 5000
```

### 3. 우선순위 큐
```java
// VIP 회원의 알림을 먼저 처리
@Bean
public Queue priorityQueue() {
    return new Queue("flight-alert-priority", true, false, false,
        Map.of("x-max-priority", 10));
}
```

### 4. 트래픽 제어 (Rate Limiting)
```java
@Component
public class RateLimitingConsumer {
    private final RateLimiter rateLimiter = 
        RateLimiter.create(100); // 초당 100개
    
    @RabbitListener(queues = "flight-alert-eval")
    public void consume(Message message) {
        rateLimiter.acquire();
        // 처리
    }
}
```

---

## 📝 마이그레이션 체크리스트

- [ ] build.gradle에 spring-boot-starter-amqp 의존성 추가
- [ ] RabbitMQConfig.java 생성
- [ ] Message DTO 클래스 생성
- [ ] Consumer 클래스 생성
- [ ] Worker Service 클래스 생성
- [ ] FlightAlertBatchService 수정
- [ ] application.yml에 RabbitMQ 설정 추가
- [ ] docker-compose.yml에 RabbitMQ 서비스 추가
- [ ] .env.example에 RabbitMQ 환경 변수 추가
- [ ] 로컬 환경에서 테스트
- [ ] 운영 환경 배포
- [ ] RabbitMQ 관리 UI로 모니터링 확인

---

## 📚 참고 자료

- [Spring AMQP Documentation](https://spring.io/projects/spring-amqp)
- [RabbitMQ Official](https://www.rabbitmq.com/)
- [RabbitMQ Management Plugin](https://www.rabbitmq.com/management.html)
