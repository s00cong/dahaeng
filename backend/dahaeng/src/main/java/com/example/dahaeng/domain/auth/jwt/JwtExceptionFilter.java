package com.example.dahaeng.domain.auth.jwt;

import java.io.IOException;

import org.springframework.web.filter.OncePerRequestFilter;

import com.example.dahaeng.global.exception.ErrorCode;
import com.example.dahaeng.global.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.util.matcher.RequestMatcher;

@RequiredArgsConstructor
public class JwtExceptionFilter extends OncePerRequestFilter {

	private final ObjectMapper objectMapper;
	private final RequestMatcher publicPathMatcher;

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		if (HttpMethod.OPTIONS.matches(request.getMethod())) {
			return true;
		}
		return publicPathMatcher.matches(request);
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
		FilterChain filterChain) throws ServletException, IOException {
		try {
			filterChain.doFilter(request, response);
		} catch (ExpiredJwtException e) {
			// 1. 토큰 만료 시 처리
			setErrorResponse(request, response, ErrorCode.EXPIRED_TOKEN);
		} catch (MalformedJwtException e) {
			// 2. 토큰 구조가 이상할 때 (위조 등)
			setErrorResponse(request, response, ErrorCode.UN_EXPECTED_TOKEN_VALIDATION);
		} catch (SignatureException e) {
			// 3. 서명이 안 맞을 때
			setErrorResponse(request, response, ErrorCode.INVALID_TOKEN);
		} catch (UnsupportedJwtException e) {
			// 4. 지원하지 않은 jwt 양식일 때
			setErrorResponse(request, response, ErrorCode.UNSUPPORTED_TOKEN);
		} catch (IllegalArgumentException e) {
			// 5. 토큰이 없는 경우 등
			setErrorResponse(request, response, ErrorCode.LOGIN_REQUIRED);
		} catch (JwtException e) {
			// 6. 그 외 JWT 관련 에러
			setErrorResponse(request, response, ErrorCode.UN_EXPECTED_TOKEN_VALIDATION);
		}
	}

	private void setErrorResponse(HttpServletRequest request, HttpServletResponse response, ErrorCode errorCode) throws IOException {
		response.setContentType("application/json;charset=UTF-8");

		response.setStatus(errorCode.getStatus().value());

		response.getWriter().write(objectMapper.writeValueAsString(
			ErrorResponse.of(
				errorCode.getStatus().value(),
				errorCode.name(),
				errorCode.getDefaultMessage(),
				request.getRequestURI()
			)
		));
	}
}
