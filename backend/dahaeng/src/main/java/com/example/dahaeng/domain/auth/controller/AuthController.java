package com.example.dahaeng.domain.auth.controller;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.auth.dto.ExchangeRequest;
import com.example.dahaeng.domain.auth.dto.ExchangeResponse;
import com.example.dahaeng.domain.auth.dto.UserResponse;
import com.example.dahaeng.domain.auth.jwt.JwtUtil;
import com.example.dahaeng.domain.auth.service.OAuthCodeService;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import com.example.dahaeng.domain.member.dto.MemberDto;
import com.example.dahaeng.domain.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final OAuthCodeService codeService;
    private final MemberService memberService;

    /**
     * 프론트에서 이 URL로 window.location.href 이동하면
     * Spring Security가 Google OAuth2 로그인 플로우를 시작한다.
     */
    @GetMapping("/google/login-url")
    public ResponseEntity<?> googleLoginUrl() {
        return ResponseEntity.ok(Map.of(
                "loginUrl", "/oauth2/authorization/google"
        ));
    }

    /**
     * OAuth2 성공 후 프론트가 redirect로 받은 code를
     * accessToken으로 교환하는 엔드포인트.
     */
    @PostMapping("/exchange")
    public ResponseEntity<?> exchange(@RequestBody ExchangeRequest request) {

        OAuthCodeService.Entry entry = codeService.consume(request.getCode());

        String accessToken = jwtUtil.createAccessToken(entry.memberId(), entry.role());

        // 사용자 기본 정보 조회
        UserResponse memberResponse = memberService.getMemberResponse(entry.memberId());

        return ResponseEntity.ok(ExchangeResponse.builder()
                .tokenType("Bearer")
                .accessToken(accessToken)
                .member(memberResponse)
                .build());
    }

    /**
     * 현재 로그인 사용자 정보.
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal CustomOAuth2User principal) {
        if (principal == null) {
            throw new CustomException(ErrorCode.LOGIN_REQUIRED);
        }

        MemberDto dto = principal.getMemberDto();
        return ResponseEntity.ok(UserResponse.builder()
                .id(dto.getId())
                .role(dto.getRole())
                .nickname(dto.getNickname())
                .profileImageUrl(dto.getProfileImageUrl())
                .build());
    }

    /**
     * 회원 탈퇴 (Soft Delete)
     */
    @DeleteMapping("/withdraw")
    public ResponseEntity<?> withdraw(@AuthenticationPrincipal CustomOAuth2User principal) {
        if (principal == null) {
            throw new CustomException(ErrorCode.LOGIN_REQUIRED);
        }

        memberService.withdraw(principal.getId());
        return ResponseEntity.ok(Map.of("message", "successfully withdrawn"));
    }
}
