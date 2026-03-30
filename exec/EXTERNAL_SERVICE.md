# EXTERNAL_SERVICE

본 문서는 현재 저장소(`S14P21D206`) 기준 외부 서비스 연동 현황을 정리한다.
기준일: 2026-03-27

## 1) 실사용 중인 외부 서비스

### 1-1. Google OAuth 2.0 (로그인)
- 용도: 사용자 소셜 로그인 및 Google 계정 식별
- 백엔드 엔드포인트: `/oauth2/authorization/google`, `/api/auth/google/login-url`, `/api/auth/exchange`
- 필수 설정값
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (기본값: `http://localhost:8080/login/oauth2/code/google`)
  - `FRONT_CALLBACK_URL` (기본값: `http://localhost:3000/`)
- 스코프: `profile`, `email`, `https://www.googleapis.com/auth/youtube.readonly`
- 비고: `access_type=offline`, `prompt=consent` 파라미터를 사용하여 동의 플로우를 구성함

### 1-2. YouTube Data API v3 (Google API)
- 용도: 사용자 YouTube 데이터 동기화
  - 재생목록
  - 재생목록 아이템
  - 구독 채널
  - 좋아요 영상
  - 채널 정보
- 호출 방식: Google OAuth Access Token(Bearer)으로 `https://www.googleapis.com/youtube/v3` 호출
- 관련 조건: Google OAuth 스코프에 `youtube.readonly` 포함 필요

### 1-3. MySQL
- 용도: 메인 서비스 RDB
- 설정값
  - `DB_URL` (기본값: `jdbc:mysql://localhost:3306/dahaeng`)
  - `DB_USERNAME` (기본값: `root`)
  - `DB_PASSWORD`
  - `DDL_AUTO` (기본값: `update`)

### 1-4. JWT
- 용도: 백엔드 인증 토큰 발급/검증
- 설정값
  - `JWT_SECRET`
  - `JWT_ACCESS_EXPIRATION` (기본값: `360000000`)
  - `JWT_REFRESH_EXPIRATION` (기본값: `604800000`)

### 1-5. 프론트엔드 Google OAuth SDK
- 라이브러리: `@react-oauth/google`
- 용도: 프론트 Google OAuth Provider 구성
- 설정값
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_API_BASE_URL`

## 2) 프로젝트 연동 외부 서비스 (추가)

아래 항목은 프로젝트 전반(백엔드/프론트/AI/배포 환경)에서 연동 대상으로 관리하는 외부 서비스이다.

- OpenAI API
  - `OPENAI_BASE_URL`, `OPENAI_API_KEY`
- AWS S3
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_ARN`
- News API
  - `NEWS_API_KEY`, `NEWS_API_BASE_URL`
- Google Places API
  - `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACES_BASE_URL`
- MongoDB
  - `MONGODB_URI`
- Redis
  - `REDIS_URI`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DATABASE`

## 3) 운영 환경 체크리스트

- Google Cloud Console
  - OAuth 동의 화면 구성
  - 승인된 리디렉션 URI에 백엔드 콜백 URI 등록
  - YouTube Data API v3 활성화
- 백엔드 환경변수
  - 최소 필수: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `FRONT_CALLBACK_URL`
- 프론트엔드 환경변수
  - 최소 필수: `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`

## 4) 참고

- 서비스별 키/시크릿은 문서에 값 자체를 기록하지 않고, 환경변수로만 관리한다.
