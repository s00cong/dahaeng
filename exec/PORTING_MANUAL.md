# PORTING MANUAL

본 문서는 `S14P21D206` 프로젝트를 신규 서버/PC 환경에 이식(포팅)할 때 필요한 실행 절차를 정리한다.
기준일: 2026-03-27

## 1. 프로젝트 개요
- 프로젝트명: 다행(Dahaeng)
- 목적: 여행지 추천/탐색 서비스 + Google/YouTube 연동 기반 사용자 관심사 분석
- 저장소 주요 모듈
  - `backend/dahaeng`: Spring Boot API 서버
  - `frontend`: React + Vite 웹 클라이언트
  - `ai`: Trip.com / Google Flight 수집 스크립트 및 데이터 파이프라인 문서
  - `exec`: 실행 참고 산출물 (`dump.sql`, 문서)

## 2. 시스템 구성 요약
- Frontend(React)에서 Backend API 호출
- Backend(Spring Boot)가 MySQL과 연동
- OAuth2 로그인은 Google 사용
- YouTube Data API(v3)는 Google OAuth Access Token으로 호출
- AI 폴더는 별도 Python 스크립트 실행형(상시 API 서버 구조 아님)

## 3. 포팅 대상 환경
### 3.1 권장 런타임
- Java 17
- Node.js 20 이상
- pnpm 9 이상
- MySQL 8.x
- Python 3.11+ (AI 스크립트 실행 시)

### 3.2 OS
- Windows / Linux 모두 가능
- 본 문서 명령어는 Windows PowerShell 기준으로 작성

## 4. 사전 준비
### 4.1 소스 준비
```bash
git clone <repository-url>
cd S14P21D206
```

### 4.2 환경 변수
환경 변수 값(.env 및 OS 환경변수)은 이미 별도 관리 중이라는 전제로 작성한다.

포팅 시 아래 키들이 누락되지 않았는지만 점검한다.
- Backend 핵심: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`
- OAuth/YouTube: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONT_CALLBACK_URL`
- Frontend: `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`
- 선택 연동: `OPENAI_API_KEY`, `AWS_*`, `NEWS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `MONGODB_URI`, `REDIS_*`

## 5. DB 세팅
본 프로젝트 운영 환경에서는 DB/인프라를 앱 실행 컴포즈와 **분리된 별도 Compose**로 관리한다.

### 5.0 DB 인프라 Compose 분리 정책
- 경로 예시: `~/app/database/docker-compose.yml`
- 포함 서비스
  - `mysql` (호스트 `8900 -> 컨테이너 3306`)
  - `mongodb` (`27017`)
  - `redis` (`6379`)
  - `namenode` (`9000`, `9870`)
  - `datanode` (`9864`, `9866`, `9867`)
- 공통 네트워크: `dahaeng-db-net` (external network)

### 5.0.1 DB 인프라 Compose 예시
아래는 현재 운영에 사용하는 DB/인프라 분리 Compose 구성 예시이다.

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: my-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: d206-1111
      MYSQL_DATABASE: dahaeng
      MYSQL_USER: d206
      MYSQL_PASSWORD: d206-1111
      TZ: Asia/Seoul
    ports:
      - "8900:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --default-authentication-plugin=mysql_native_password
      - --innodb-buffer-pool-size=1G
      - --innodb-log-file-size=256M
      - --max_allowed_packet=256M
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-ud206", "-pd206-1111"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    networks:
      - db-external

  mongodb:
    image: mongo:7
    container_name: my-mongo
    restart: always
    environment:
      TZ: Asia/Seoul
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand({ ping: 1 })"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    networks:
      - db-external

  redis:
    image: redis:7-alpine
    container_name: my-redis
    restart: always
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass d206-1111
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "yourStrongRedisPassword", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
      start_period: 10s
    networks:
      - db-external

  namenode:
    image: bde2020/hadoop-namenode:2.0.0-hadoop3.2.1-java8
    container_name: namenode
    hostname: namenode
    restart: always
    environment:
      CLUSTER_NAME: travel-data
      CORE_CONF_fs_defaultFS: hdfs://namenode:9000
      HDFS_CONF_dfs_replication: 1
    ports:
      - "9000:9000"
      - "9870:9870"
    volumes:
      - hadoop_namenode:/hadoop/dfs/name
    networks:
      - db-external

  datanode:
    image: bde2020/hadoop-datanode:2.0.0-hadoop3.2.1-java8
    container_name: datanode
    hostname: datanode
    restart: always
    environment:
      CLUSTER_NAME: travel-data
      CORE_CONF_fs_defaultFS: hdfs://namenode:9000
      HDFS_CONF_dfs_datanode_hostname: 127.0.0.1
      HDFS_CONF_dfs_datanode_use_datanode_hostname: "true"
      HDFS_CONF_dfs_client_use_datanode_hostname: "true"
    ports:
      - "9864:9864"
      - "9866:9866"
      - "9867:9867"
    volumes:
      - hadoop_datanode:/hadoop/dfs/data
    depends_on:
      - namenode
    networks:
      - db-external

volumes:
  mysql_data:
  mongo_data:
  redis_data:
  hadoop_namenode:
  hadoop_datanode:

networks:
  db-external:
    external: true
    name: dahaeng-db-net
```

### 5.1 DB 생성
MySQL에서 서비스 DB를 생성한다.
```sql
CREATE DATABASE dahaeng CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5.2 덤프 적재
프로젝트 루트 기준:
```bash
mysql -u <계정> -p dahaeng < exec/dump.sql
```

## 6. 서비스 실행
권장 실행 순서: `Network -> DB/Infra Compose -> App Compose(또는 개별 실행)`

### 6.0 두 Compose 파일 네트워크 연결
DB/Infra Compose와 App Compose를 분리 운영할 때는 **동일 external network**를 공유해야 한다.

1. 공용 네트워크 생성(최초 1회)
```bash
docker network create dahaeng-db-net
```

2. DB/Infra Compose 실행
```bash
cd ~/app/database
docker compose up -d
```

3. App Compose(백엔드/프론트)에서도 같은 네트워크 선언
```yaml
networks:
  db-external:
    external: true
    name: dahaeng-db-net
```

4. App 서비스(예: backend)가 `db-external` 네트워크에 붙어 있는지 확인
```bash
docker network inspect dahaeng-db-net
```

5. Backend DB 접속 문자열은 MySQL 컨테이너 기준으로 설정
- 권장 예시: `jdbc:mysql://my-mysql:3306/dahaeng`
- 호스트 포트(`8900`)는 외부(호스트에서 직접 접속)용이며, 같은 Docker network 내 컨테이너 간 통신은 컨테이너 포트(`3306`) 사용

### 6.0.1 App Compose 예시 (backend + frontend)
아래 예시는 앱 전용 Compose 파일 예시이다. 핵심은 `dahaeng-db-net`에 앱 서비스도 연결하는 것이다.

```yaml
services:
  backend:
    image: dahaeng-backend:latest
    container_name: dahaeng-backend
    restart: always
    ports:
      - "8080:8080"
    environment:
      DB_URL: jdbc:mysql://my-mysql:3306/dahaeng
      DB_USERNAME: d206
      DB_PASSWORD: d206-1111
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}
      FRONT_CALLBACK_URL: ${FRONT_CALLBACK_URL}
    networks:
      - db-external

  frontend:
    image: dahaeng-frontend:latest
    container_name: dahaeng-frontend
    restart: always
    ports:
      - "3000:80"
    environment:
      VITE_API_BASE_URL: http://<SERVER_HOST>:8080
      VITE_GOOGLE_CLIENT_ID: ${VITE_GOOGLE_CLIENT_ID}
    depends_on:
      - backend
    networks:
      - db-external

networks:
  db-external:
    external: true
    name: dahaeng-db-net
```

### 6.0.2 분리 Compose 실행 순서 (권장)
1. DB/Infra 네트워크 생성 (최초 1회)
```bash
docker network create dahaeng-db-net
```

2. DB/Infra 기동
```bash
cd ~/app/database
docker compose up -d
```

3. App 기동
```bash
cd ~/app/app-compose
docker compose up -d
```

4. 상태 확인
```bash
docker compose -f ~/app/database/docker-compose.yml ps
docker compose -f ~/app/app-compose/docker-compose.yml ps
docker network inspect dahaeng-db-net
```

### 6.0.3 분리 Compose 중지/재기동
- 앱만 중지
```bash
docker compose -f ~/app/app-compose/docker-compose.yml down
```

- DB/Infra까지 전체 중지
```bash
docker compose -f ~/app/database/docker-compose.yml down
```

- 앱만 재기동
```bash
docker compose -f ~/app/app-compose/docker-compose.yml up -d --build
```

### 6.1 Backend 실행 (Spring Boot)
```bash
cd backend/dahaeng
.\gradlew.bat bootRun
```

기본 포트: `8080`

### 6.2 Frontend 실행 (React + Vite)
```bash
cd frontend
pnpm install
pnpm dev
```

기본 포트: `3000`(환경/설정에 따라 Vite 기본 포트 사용)

### 6.3 AI 스크립트 실행 (선택)
AI 모듈은 배치/수집 스크립트 중심으로 운영한다.

예시:
```bash
cd ai/trip_com
python trip_scraper.py
```

```bash
cd ai/google_flight
python auto_travel_scraper_byID_season.py
```

## 7. 포트 및 접근 경로
### 7.1 로컬 기본 포트
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- MySQL(호스트): `8900` (컨테이너 내부 `3306`)

### 7.2 주요 API 경로
- 인증 시작: `/oauth2/authorization/google`
- 로그인 URL 조회: `/api/auth/google/login-url`
- 교환: `/api/auth/exchange`
- YouTube 동기화: `/api/youtube/sync`

## 8. 운영 배포 시 체크 포인트
- OAuth Redirect URI에 운영 도메인 기준 콜백 등록
- CORS 허용 Origin이 운영 프론트 도메인과 일치하는지 확인
- HTTPS(리버스 프록시/Nginx) 사용 시 `FRONT_CALLBACK_URL`, `GOOGLE_REDIRECT_URI`를 운영 URL로 적용
- 비밀키(`JWT_SECRET`, API 키, 클라우드 키)는 코드 저장소에 저장하지 않음
- 분리 Compose 사용 시 DB/앱 서비스가 같은 `dahaeng-db-net`에 연결되어 있는지 항상 확인

## 9. 배포 파일 관리 기준 (Nginx / Docker)
운영 포팅 시 아래 배포 파일이 필요하며, 본 저장소에 없으면 서버 운영 경로(예: `~/app`)에서 별도 관리한다.

### 9.1 필수 파일
- App Compose: `~/app/app-compose/docker-compose.yml`
- DB/Infra Compose: `~/app/database/docker-compose.yml`
- Backend Dockerfile: `backend/Dockerfile` (또는 운영 레포 내 동등 경로)
- Frontend Dockerfile: `frontend/Dockerfile` (또는 운영 레포 내 동등 경로)
- Nginx 설정: `/etc/nginx/sites-available/<service>.conf`

### 9.2 Nginx 라우팅 기준
- `/` -> frontend 컨테이너
- `/api/` -> backend 컨테이너
- `/oauth2/` -> backend 컨테이너 (OAuth2 로그인 플로우)
- `/login/oauth2/` -> backend 컨테이너 (OAuth2 콜백 처리)

### 9.3 HTTPS 설정(적용 권장)
- 인증서: Let's Encrypt(Certbot) 사용
- 80 포트는 443으로 리다이렉트
- 443 서버블록에서 SSL 인증서/키 경로 지정
- `X-Forwarded-Proto`, `X-Forwarded-For` 헤더 전달

예시 명령:
```bash
sudo certbot --nginx -d <도메인> -d www.<도메인>
sudo nginx -t
sudo systemctl reload nginx
```

### 9.3.1 현재 운영 nginx.conf 예시
아래는 현재 운영 기준 설정 예시이다.

```nginx
server {
    listen 80;
    server_name dahaeng.site j14d206.p.ssafy.io;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name dahaeng.site j14d206.p.ssafy.io;

    ssl_certificate /etc/letsencrypt/live/dahaeng.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dahaeng.site/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
        try_files $uri =404;
    }

    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://backend:8080/api/;
    }

    location /oauth2/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://backend:8080/oauth2/;
    }

    location /login/oauth2/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://backend:8080/login/oauth2/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 9.4 OAuth와 HTTPS 연계 주의사항
- Google Cloud Console의 Authorized redirect URI를 반드시 `https://` 기준으로 등록
- `GOOGLE_REDIRECT_URI`, `FRONT_CALLBACK_URL` 모두 HTTPS 도메인으로 설정
- HTTP/HTTPS 혼용 시 OAuth redirect mismatch 오류가 발생할 수 있음

## 10. 검증 절차
### 10.1 백엔드 기동 확인
- 백엔드 로그에 DB 연결 오류가 없는지 확인

### 10.2 프론트 연동 확인
- 프론트 접속 후 API 요청이 `VITE_API_BASE_URL`로 정상 전송되는지 확인

### 10.3 OAuth/YouTube 확인
- Google 로그인 성공 후 `/api/auth/exchange` 응답 확인
- 인증 후 `/api/youtube/sync` 호출 시 정상 완료 메시지 확인

## 11. 트러블슈팅
- Google 로그인 실패
  - Redirect URI 불일치 여부 확인
  - `GOOGLE_CLIENT_ID/SECRET` 적용 여부 확인
- 401 반복 발생
  - `JWT_SECRET`/토큰 만료시간 설정 및 클라이언트 토큰 저장 로직 점검
- DB 연결 실패
  - `DB_URL`, 계정, 네트워크 접근 권한 점검
- Redis 컨테이너 healthcheck 비정상
  - `redis-server --requirepass` 값과 `healthcheck`의 `redis-cli -a` 비밀번호가 동일한지 확인
- CORS 오류
  - 백엔드 CORS 허용 Origin 설정값과 실제 프론트 도메인 일치 여부 점검
