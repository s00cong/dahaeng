# App 배포 가이드 (EC2 + Docker Compose + Nginx + HTTPS)

이 문서는 `deploy/app/docker-compose.yml` 기준으로 **백엔드(Spring Boot) + 프론트(Vite 정적 파일 + Nginx)** 를 EC2에 배포하는 방법을 설명합니다.

핵심 목표는 다음 3가지입니다.

1. `backend`와 `frontend`를 Docker Compose로 안정적으로 실행
2. 프론트에서 `/api` 요청을 nginx가 backend로 프록시
3. certbot으로 Let's Encrypt 인증서를 발급받아 HTTPS 적용

---

## 1. 이 배포가 실제로 하는 일

구조를 먼저 이해하면 명령어가 쉬워집니다.

- 브라우저 -> `https://도메인`
- EC2의 `frontend` 컨테이너(nginx)가 443(HTTPS)로 요청 수신
- 정적 파일(`/`, `/assets/*`)은 nginx가 직접 응답
- API 요청(`/api/*`)은 nginx가 `backend:8080`으로 전달(reverse proxy)
- 인증서 발급/갱신은 `certbot` 컨테이너가 수행

즉, 외부에서는 프론트만 보이고, 백엔드는 내부 네트워크로만 통신합니다.

---

## 2. 준비물

### 2-1. EC2 서버 준비

- Docker 설치
- Docker Compose v2 설치 (`docker compose` 명령)
- 80/443 포트 오픈
  - EC2 Security Group 인바운드: TCP 80, 443 허용
  - 서버 방화벽 사용 시(`ufw`, `firewalld`) 80/443 허용

확인 명령:

```bash
docker --version
docker compose version
```

### 2-2. 도메인 준비

- A 레코드가 EC2 Public IP를 가리켜야 함
  - `dahaeng.site`
  - `j14d206.p.ssafy.io`

DNS 전파 전에는 인증서 발급이 실패할 수 있습니다.

### 2-3. 프로젝트 위치(예시)

```text
/home/ubuntu/S14P21D206/
  ├─ backend/dahaeng
  ├─ frontend
  └─ deploy/app
      ├─ docker-compose.yml
      ├─ .env.example
      └─ .env   # 직접 생성
```

---

## 3. 환경변수(.env) 만들기

`deploy/app/.env.example` 기반으로 `.env`를 만듭니다.

```bash
cd /home/ubuntu/S14P21D206
cp deploy/app/.env.example deploy/app/.env
vi deploy/app/.env
```

최소 확인 항목:

- DB 연결
  - `DB_URL`
  - `DB_USERNAME`
  - `DB_PASSWORD`
  - `MONGODB_URI`
- 인증/외부 API
  - `JWT_SECRET`
  - `OPENAI_API_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- 프론트 빌드 변수
  - `VITE_API_BASE_URL=/api`
  - `VITE_GOOGLE_CLIENT_ID`
- OAuth 리다이렉트
  - `GOOGLE_REDIRECT_URI=https://<도메인>/login/oauth2/code/google`
  - `FRONT_CALLBACK_URL=https://<도메인>/`

주의:

- `VITE_*` 값은 **빌드 타임 변수**입니다.
- 값 변경 후에는 반드시 `--build`로 프론트를 재빌드해야 반영됩니다.

---

## 4. 네트워크 준비

앱 compose와 DB compose를 분리 운영하는 경우 external network를 맞춰야 합니다.

기본 네트워크명: `dahaeng-db-net`

```bash
docker network create dahaeng-db-net
```

이미 있으면 에러가 나도 무시해도 됩니다.

---

## 5. 백엔드 1차 실행(인증서 발급 전 점검)

현재 `frontend/nginx.conf`는 시작 시점부터 실인증서 파일
`/etc/letsencrypt/live/dahaeng.site/fullchain.pem` 을 요구합니다.
따라서 인증서가 없는 최초 배포에서는 `frontend`를 먼저 올리면 실패할 수 있습니다.

먼저 `backend`만 띄워서 애플리케이션/DB 연결 상태를 확인합니다.

```bash
cd /home/ubuntu/S14P21D206
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build backend
```

상태 확인:

```bash
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env ps
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env logs backend
```

점검 포인트:

- `backend`가 `Up`
- `backend` 로그에 DB 연결 오류/환경변수 오류가 없는지 확인

---

## 6. HTTPS 적용 (Certbot)

현재 nginx 설정은 아래 흐름으로 동작합니다.

- 80 포트: ACME 챌린지(`/.well-known/acme-challenge/`) 응답 + 그 외는 HTTPS로 리다이렉트
- 443 포트: SSL 인증서로 실제 서비스

### 6-1. 인증서 최초 발급 (1회)

```bash
cd /home/ubuntu/S14P21D206

# 최초 발급 시에는 frontend가 인증서 없이 뜨지 않을 수 있으므로 standalone 모드 사용
# (80 포트를 certbot이 임시 점유하므로, 80 포트를 쓰는 다른 프로세스는 잠시 중지)
docker run --rm -p 80:80 \
  -v "$(pwd)/deploy/app/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/deploy/app/certbot/www:/var/www/certbot" \
  certbot/certbot:latest certonly --standalone \
  -d dahaeng.site -d j14d206.p.ssafy.io \
  --email <YOUR_EMAIL> --agree-tos --no-eff-email
```

성공 후 앱 기동:

```bash
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build
```

### 6-2. 인증서 갱신

수동 갱신 테스트:

```bash
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env run --rm certbot renew --webroot -w /var/www/certbot
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env exec -T frontend nginx -s reload
```

자동 갱신(권장: 매일 새벽 3시, 만료 임박 시에만 실제 갱신됨):

```cron
0 3 * * * cd /home/ubuntu/S14P21D206 && docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env run --rm certbot renew --webroot -w /var/www/certbot --quiet && docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env exec -T frontend nginx -s reload
```

---

## 7. 최종 검증 체크리스트

배포 후 아래 항목을 모두 확인하세요.

- `https://dahaeng.site` 접속 가능
- 주소창 자물쇠(인증서 정상)
- `http://dahaeng.site` 접속 시 `https://...`로 리다이렉트
- 프론트 페이지 새로고침 시 404 없이 동작(SPA fallback)
- `/api/*` 호출이 정상 응답
- OAuth 로그인 사용 시 Google Console redirect URI가 HTTPS 주소와 일치

---

## 8. 재배포 절차 (코드 변경 후)

```bash
cd /home/ubuntu/S14P21D206
git pull
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build
```

정리:

```bash
docker image prune -f
```

---

## 9. 자주 발생하는 문제

### 9-1. 443 접속이 안 됨

- Security Group 443 오픈 여부 확인
- 인증서 파일 존재 확인:
  - `/home/ubuntu/S14P21D206/deploy/app/certbot/conf/live/dahaeng.site/fullchain.pem`
- `frontend` 로그에 SSL 관련 에러 확인

### 9-2. certbot 발급 실패

- 도메인 A 레코드가 EC2 IP를 가리키는지 확인
- 80 포트가 외부에서 열려 있는지 확인
- 발급 시점에 80 포트를 다른 프로세스(nginx/apache/기존 컨테이너)가 점유하지 않는지 확인

### 9-3. 프론트는 뜨는데 API 실패

- `frontend/nginx.conf`의 `proxy_pass http://backend:8080/api/;` 확인
- `backend` 컨테이너 상태/로그 확인
- `VITE_API_BASE_URL=/api`인지 확인 후 프론트 재빌드

### 9-4. .env 바꿨는데 프론트 반영 안 됨

- 프론트는 빌드 타임 변수이므로 반드시 `--build` 재배포 필요

---

## 10. 운영 보안 메모

- `.env` 파일은 절대 Git에 커밋하지 않음
- 노출된 비밀값은 즉시 폐기/재발급
- 운영에서 백엔드 포트(8080) 외부 직접 노출 금지

---

## 11. 빠른 실행 요약 (처음 하는 사람용)

```bash
# 1) 프로젝트 이동
cd /home/ubuntu/S14P21D206

# 2) .env 생성
cp deploy/app/.env.example deploy/app/.env
vi deploy/app/.env

# 3) 네트워크 생성 (최초 1회)
docker network create dahaeng-db-net

# 4) backend 1차 점검
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build backend

# 5) 인증서 발급 (최초 1회)
docker run --rm -p 80:80 \
  -v "$(pwd)/deploy/app/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/deploy/app/certbot/www:/var/www/certbot" \
  certbot/certbot:latest certonly --standalone \
  -d dahaeng.site -d j14d206.p.ssafy.io \
  --email <YOUR_EMAIL> --agree-tos --no-eff-email

# 6) 전체 앱 기동
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build
```

이 6단계가 완료되면 HTTPS 배포가 동작해야 합니다.
