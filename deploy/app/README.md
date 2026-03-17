# App Compose Deployment Guide (EC2)

이 문서는 `deploy/app/docker-compose.yml` 기준으로 **backend + frontend 앱 스택**을 EC2에 배포/점검하는 절차를 정리합니다.
DB(MySQL, MongoDB, Hadoop)는 별도 database compose에서 관리한다는 전제를 사용합니다.

---

## 0. 문서 범위

* 대상: `backend`, `frontend`
* 비대상: `ai`, `database compose` 자체 설정 변경
* 원칙: 실제 비밀값은 Git에 올리지 않고, EC2의 `deploy/app/.env`로만 주입

---

## 1. EC2 사전 준비 사항

### 1-1. Docker / Docker Compose 확인

```bash
docker --version
docker compose version
```

### 1-2. External Network 준비

앱 compose와 DB compose를 분리 유지하면서 컨테이너 간 통신을 하려면 공통 external network가 필요합니다.

`deploy/app/docker-compose.yml` 기본값

* `DB_EXTERNAL_NETWORK=dahaeng-db-net`

네트워크가 없다면 생성합니다.

```bash
docker network create dahaeng-db-net
```

### 1-3. Database Compose 선기동 확인

앱 stack 실행 전 database compose의 DB 컨테이너가 먼저 실행되어 있어야 합니다.

예시 서비스명

* MySQL: `mysql`
* MongoDB: `mongodb`

backend DB host는 **container_name이 아니라 database compose의 service name**을 사용합니다.

```text
DB_URL=jdbc:mysql://mysql:3306/dahang
MONGODB_URI=mongodb://mongodb:27017/dahang
```

### 1-4. EC2 디렉토리 구조 예시

```text
/home/ubuntu/
└── S14P21D206/
    ├── backend/
    │   └── dahaeng/
    ├── frontend/
    └── deploy/
        └── app/
            ├── docker-compose.yml
            ├── .env.example
            └── .env   # 직접 생성 (Git 미추적)
```

---

## 2. 최초 배포 절차

### 2-1. GitLab clone

```bash
cd /home/ubuntu
git clone <YOUR_GITLAB_REPO_URL> S14P21D206
cd S14P21D206
```

### 2-2. `.env` 생성

`deploy/app/.env.example`을 기반으로 `.env` 파일을 생성합니다.

```bash
cp deploy/app/.env.example deploy/app/.env
vi deploy/app/.env
```

필수 확인

* backend runtime env

  * `DB_URL`
  * `DB_PASSWORD`
  * `JWT_SECRET`
  * `OPENAI_API_KEY`

* frontend build env

  * `VITE_API_BASE_URL`
  * `VITE_GOOGLE_CLIENT_ID`
  * `VITE_ENABLE_MSW`

* `DB_EXTERNAL_NETWORK`

### 2-3. 앱 스택 빌드 및 기동

```bash
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build
```

---

## 3. 재배포 절차

```bash
cd /home/ubuntu/S14P21D206

git pull

docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build
```

불필요 이미지 정리

```bash
docker image prune -f
```

⚠️ **중요**

`VITE_*` 값은 **빌드 타임 변수**입니다.

`.env` 수정 후 반드시 아래 명령으로 재빌드해야 프론트엔드에 반영됩니다.

```bash
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build
```

---

## 4. 점검 체크리스트

```text
[배포 후 기본 점검]
[ ] docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env ps
[ ] docker ps 에서 backend/frontend 컨테이너가 Up 상태
[ ] 브라우저에서 frontend 접속 확인 (EC2 Public IP 또는 도메인)
[ ] frontend에서 /api 호출 시 정상 응답 (nginx → backend 프록시)
[ ] backend 로그에서 Spring Boot 정상 기동 확인
[ ] backend 로그에서 MySQL / MongoDB 연결 성공 확인
[ ] docker network inspect dahaeng-db-net 으로 backend + DB 컨테이너 네트워크 연결 확인
```

추천 점검 명령

```bash
# 상태 확인
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env ps

# compose 기반 로그 확인
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env logs backend

docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env logs frontend

# 특정 컨테이너 로그 확인 (선택)
docker logs --tail 200 <backend-container-name>

docker logs --tail 200 <frontend-container-name>

# 네트워크 확인
docker network inspect dahaeng-db-net
```

확인 포인트

* backend 컨테이너 존재
* mysql 컨테이너 존재
* mongodb 컨테이너 존재

---

## 5. 장애 확인 포인트

### 5-1. frontend는 뜨는데 API가 안 될 때

확인 사항

* `frontend/nginx.conf`의

```text
proxy_pass http://backend:8080/api/
```

* compose 서비스명이 `backend`인지 확인
* backend 컨테이너 상태 및 로그 확인
* backend가 `app-internal` 네트워크에 연결되어 있는지 확인

### 5-2. backend DB 연결 실패

확인 사항

* `DB_URL`, `MONGODB_URI` host가 DB 서비스명과 일치하는지 확인

* MySQL → `mysql`

* MongoDB → `mongodb`

* DB 컨테이너 정상 실행 여부 확인

* `DB_EXTERNAL_NETWORK` 값이 DB compose 네트워크와 동일한지 확인

### 5-3. `VITE_*` 값 반영이 안 될 때

원인

`.env` 수정 후 재빌드 없이 컨테이너만 재기동한 경우

해결

```bash
docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build
```

### 5-4. nginx reverse proxy 문제

확인 사항

* frontend 컨테이너 내부 nginx 설정 반영 여부
* `/api` 요청이 backend로 전달되는지 확인
* backend API context path와 `/api` prefix 일치 여부 확인

---

## 6. 운영 주의사항

* `.env` 파일은 **절대 Git에 커밋하지 않습니다.**
* 과거 노출된 비밀값은 즉시 **재발급 또는 폐기 후 교체**해야 합니다.
* backend `8080` 포트 외부 노출은 **초기 점검 시에만 임시 사용**합니다.
* 운영 환경에서는 backend 포트를 외부에 노출하지 않습니다.
* DB host는 `container_name`이 아니라 **database compose service name 기준**으로 사용합니다.

---

## 7. 참고 실행 명령

```bash
# 앱 기동

docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env up -d --build

# 상태 확인

docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env ps

# 로그 확인

docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env logs backend

docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env logs frontend

# 중지

docker compose -f deploy/app/docker-compose.yml --env-file deploy/app/.env down
```
