package com.example.dahaeng.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    /* =========================
     *  Common
     * ========================= */
    INVALID_PARAMETER(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청 형식이 올바르지 않습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 HTTP 메서드입니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),
    SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "일시적으로 서비스를 사용할 수 없습니다."),

    /* =========================
     *  Validation
     * ========================= */
    VALIDATION_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "유효성 검증에 실패했습니다."),
    MISSING_REQUEST_BODY(HttpStatus.BAD_REQUEST, "요청 본문이 존재하지 않습니다."),
    TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "요청 파라미터 타입이 올바르지 않습니다."),

    /* =========================
     *  Authentication
     * ========================= */
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
    UNSUPPORTED_TOKEN(HttpStatus.UNAUTHORIZED, "지원하지 않는 토큰입니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
    OAUTH_CODE_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않거나 만료된 인증 코드입니다."),
    LOGIN_REQUIRED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    UN_EXPECTED_TOKEN_VALIDATION(HttpStatus.UNAUTHORIZED, "확인되지 않은 토큰 오류입니다."),

    /* =========================
     *  Authorization
     * ========================= */
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 리소스에 접근할 권한이 없습니다."),

    /* =========================
     *  Business Logic
     * ========================= */
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "이미 존재하는 데이터입니다."),
    RESOURCE_CONFLICT(HttpStatus.CONFLICT, "리소스 충돌이 발생했습니다."),
    OPERATION_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "허용되지 않는 작업입니다."),
    INVALID_STATUS(HttpStatus.BAD_REQUEST, "올바르지 않은 상태값입니다."),

    /* =========================
     *  Database
     * ========================= */
    DATABASE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "데이터베이스 오류가 발생했습니다."),
    DATA_INTEGRITY_VIOLATION(HttpStatus.CONFLICT, "데이터 무결성 제약 조건 위반입니다."),
    QUERY_TIMEOUT(HttpStatus.INTERNAL_SERVER_ERROR, "쿼리 실행 시간이 초과되었습니다."),

    /* =========================
     *  External API
     * ========================= */
    EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "외부 API 호출 중 오류가 발생했습니다."),
    EXTERNAL_API_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "외부 API 응답 시간이 초과되었습니다."),
    EXTERNAL_API_BAD_RESPONSE(HttpStatus.BAD_GATEWAY, "외부 API 응답이 올바르지 않습니다."),

    /* =========================
     *  File / Storage
     * ========================= */
    FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "파일 업로드에 실패했습니다."),
    FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다."),
    INVALID_FILE_TYPE(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 형식입니다."),
    FILE_SIZE_EXCEEDED(HttpStatus.PAYLOAD_TOO_LARGE, "파일 크기가 제한을 초과했습니다."),

    /* =========================
     *  Async / Job
     * ========================= */
    JOB_NOT_FOUND(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다."),
    JOB_ALREADY_RUNNING(HttpStatus.CONFLICT, "이미 실행 중인 작업입니다."),
    JOB_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "작업 실행에 실패했습니다."),

    /* =========================
     *  Rate Limit / Security
     * ========================= */
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "요청 횟수를 초과했습니다."),
    SUSPICIOUS_REQUEST(HttpStatus.FORBIDDEN, "의심스러운 요청이 감지되었습니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }
}
