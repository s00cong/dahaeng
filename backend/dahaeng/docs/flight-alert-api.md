# 항공권 알림 API 명세

## 공통

- Base URL
  - 항공권 알림: `/api/flight-alerts`
  - 전체 항공권 알림 설정: `/api/members/me/flight-alert-settings`
- 인증: `Bearer Access Token`
- 로그인 필요: 예
- 관리자 권한 필요: 아니오
- 알림 설정 진입점: 도시 상세 화면
- 알림 관리 화면: 마이페이지
- 알림 평가는 매일 오전 `09:00` 수행

## 알림 정책

- 도시별 알림 ON/OFF
  - `subscription.enabled`
  - 예: 도쿄만 끄기, 오사카는 유지
- 전체 항공권 알림 ON/OFF
  - `flightAlertEnabled`
  - 예: 항공권 알림 자체를 모두 끄기
- 메일 알림 ON/OFF
  - `emailAlertEnabled`
  - 앱 내 알림은 유지하고 메일만 끄기

## 알림 타입

- `TARGET_HIT`
  - `matchedPrice <= thresholdPrice`
- `NEAR_TARGET`
  - `thresholdPrice < matchedPrice <= floor(thresholdPrice * 1.05)`

## 1. 항공권 알림 구독 목록 조회

- 기능: 로그인한 사용자의 도시별 항공권 알림 구독 목록 조회
- HTTP 메서드: `GET`
- API Path: `/api/flight-alerts/subscriptions`
- request:

```json
{}
```

- response:

```json
[
  {
    "subscriptionId": 12,
    "cityId": 101,
    "cityName": "Tokyo",
    "countryName": "Japan",
    "thresholdPrice": 250000,
    "enabled": true,
    "lastNotifiedPrice": 235073,
    "lastNotifiedAt": "2026-03-24T09:00:00"
  },
  {
    "subscriptionId": 13,
    "cityId": 102,
    "cityName": "Osaka",
    "countryName": "Japan",
    "thresholdPrice": 280000,
    "enabled": false,
    "lastNotifiedPrice": null,
    "lastNotifiedAt": null
  }
]
```

- 설명:
  - 마이페이지에서 도시별 항공권 알림 관리 목록으로 사용
  - 알림 설정 단위는 `member-city`
  - 같은 도시는 1개 구독만 유지

---

## 2. 항공권 알림 구독 생성 또는 수정

- 기능: 특정 도시에 대해 항공권 기준가 알림 생성 또는 수정
- HTTP 메서드: `PUT`
- API Path: `/api/flight-alerts/subscriptions/{cityId}`
- request:

Path Variable

```json
{
  "cityId": 101
}
```

Body

```json
{
  "thresholdPrice": 250000
}
```

- response:

```json
{
  "subscriptionId": 12,
  "cityId": 101,
  "cityName": "Tokyo",
  "countryName": "Japan",
  "thresholdPrice": 250000,
  "enabled": true,
  "lastNotifiedPrice": null,
  "lastNotifiedAt": null
}
```

- 설명:
  - 도시 상세 화면에서 사용
  - 기존 구독이 없으면 생성
  - 기존 구독이 있으면 기준가 수정
  - 수정 시 `enabled=true` 상태로 유지 또는 복구
  - 기준가 수정 시 `lastNotifiedPrice`, `lastNotifiedAt` 초기화
  - `thresholdPrice`는 필수이며 `1` 이상이어야 함

---

## 3. 도시별 항공권 알림 ON/OFF 수정

- 기능: 특정 도시 항공권 알림 켜기 또는 끄기
- HTTP 메서드: `PATCH`
- API Path: `/api/flight-alerts/subscriptions/{cityId}/enabled`
- request:

Path Variable

```json
{
  "cityId": 101
}
```

Body

```json
{
  "enabled": false
}
```

- response:

```json
{
  "subscriptionId": 12,
  "cityId": 101,
  "enabled": false
}
```

- 설명:
  - 마이페이지에서 도시별 알림 끄기/켜기에 사용
  - 예: 도쿄만 끄고 오사카는 유지
  - `enabled=false`이면 해당 도시만 더 이상 알림 생성 대상이 아님

---

## 4. 항공권 알림 목록 조회

- 기능: 로그인한 사용자의 앱 내 항공권 알림 목록 조회
- HTTP 메서드: `GET`
- API Path: `/api/flight-alerts/notifications`
- request:

Query

```json
{
  "page": 0,
  "size": 10,
  "sort": "createdAt,desc"
}
```

- response:

```json
{
  "content": [
    {
      "notificationId": 33,
      "cityId": 101,
      "cityName": "Tokyo",
      "alertType": "TARGET_HIT",
      "thresholdPrice": 350000,
      "matchedPrice": 328000,
      "nearestMatchDate": "2026-04-12",
      "bestPriceDate": "2026-05-14",
      "matchedDateCount": 3,
      "collectedAt": "2026-03-23T00:00:00",
      "isRead": false,
      "createdAt": "2026-03-23T09:00:00"
    },
    {
      "notificationId": 34,
      "cityId": 102,
      "cityName": "Osaka",
      "alertType": "NEAR_TARGET",
      "thresholdPrice": 280000,
      "matchedPrice": 292000,
      "nearestMatchDate": "2026-05-20",
      "bestPriceDate": "2026-05-28",
      "matchedDateCount": 2,
      "collectedAt": "2026-03-23T00:00:00",
      "isRead": true,
      "createdAt": "2026-03-23T09:00:00"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1,
  "hasNext": false
}
```

- 설명:
  - 최신순 알림 목록 조회
  - `matchedDateCount`: 기준가 이하 또는 근접 가격 날짜 개수
  - 각 알림에는 알림 타입, 기준가, 발견가, 가장 가까운 날짜, 가장 싼 날짜, 매칭 날짜 개수, 수집 시각이 포함

---

## 5. 항공권 알림 unread 개수 조회

- 기능: 읽지 않은 항공권 알림 개수 조회
- HTTP 메서드: `GET`
- API Path: `/api/flight-alerts/notifications/unread-count`
- request:

```json
{}
```

- response:

```json
{
  "count": 3
}
```

- 설명:
  - 벨 아이콘 뱃지 표시용 unread 개수 조회

---

## 6. 항공권 알림 읽음 처리

- 기능: 특정 항공권 알림 읽음 처리
- HTTP 메서드: `PATCH`
- API Path: `/api/flight-alerts/notifications/{notificationId}/read`
- request:

Path Variable

```json
{
  "notificationId": 33
}
```

- response:

```json
{
  "message": "알림을 읽음 처리했습니다.",
  "id": 33
}
```

- 설명:
  - 본인 알림만 읽음 처리 가능
  - 이미 읽은 알림은 그대로 유지

---

## 7. 전체 항공권 알림 설정 조회

- 기능: 사용자의 전체 항공권 알림 설정 조회
- HTTP 메서드: `GET`
- API Path: `/api/members/me/flight-alert-settings`
- request:

```json
{}
```

- response:

```json
{
  "flightAlertEnabled": true,
  "emailAlertEnabled": true
}
```

- 설명:
  - `flightAlertEnabled`
    - 전체 항공권 알림 ON/OFF
  - `emailAlertEnabled`
    - 메일 알림 ON/OFF

---

## 8. 전체 항공권 알림 설정 수정

- 기능: 사용자의 전체 항공권 알림 설정 수정
- HTTP 메서드: `PATCH`
- API Path: `/api/members/me/flight-alert-settings`
- request:

```json
{
  "flightAlertEnabled": false,
  "emailAlertEnabled": false
}
```

- response:

```json
{
  "flightAlertEnabled": false,
  "emailAlertEnabled": false
}
```

- 설명:
  - `flightAlertEnabled=false`
    - 앱 내 알림과 메일 알림 모두 생성하지 않음
  - `emailAlertEnabled=false`
    - 앱 내 알림은 유지
    - 메일만 발송하지 않음
