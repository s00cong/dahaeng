package com.example.dahaeng.domain.auth.jwt;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.member.dto.MemberDto;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.micrometer.common.util.StringUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final MemberRepository memberRepository;
    private final RequestMatcher publicPathMatcher;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        return publicPathMatcher.matches(request);
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {

        // 이미 인증된 경우(다른 필터/인증 처리 후) 스킵
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        // 1) Authorization 헤더에서 Bearer 토큰 추출
        String header = request.getHeader("Authorization");
        if (header == null || StringUtils.isEmpty(header)) {
            throw new IllegalArgumentException("토큰이 없습니다.");
        }

        if (!header.startsWith("Bearer ")) {
            throw new UnsupportedJwtException("지원하지 않는 토큰 양식입니다.");
        }

        String token = header.substring(7).trim();
        if (token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2) 서명/만료/형식 검증
        jwtUtil.validateToken(token);

        // 3) access 토큰인지 확인 (refresh로 인증하는 경우 방지)
        if (!"access".equals(jwtUtil.getCategory(token))) {
            throw new MalformedJwtException("Need Access");
        }

        // 4) 토큰에서 memberId, role 추출
        Long memberId = jwtUtil.getMemberId(token);
        String role = jwtUtil.getRole(token);

        if (memberId == null || role == null) {
            throw new MalformedJwtException("Don't have memberId or role");
        }

        // 5) DB에서 사용자 조회 (탈퇴/권한변경 등 확인)
        //    성능 이슈가 있으면 최소 정보만 토큰에 담고 DB 조회를 생략할 수도 있음.
        Member member = memberRepository.findById(memberId).orElse(null);
        if (member == null) {
            throw new JwtException("Member not found");
        }
        if (member.getDeletedAt() != null) {
            throw new JwtException("Member not found");
        }

        // 6) Principal(CustomOAuth2User) 구성
        MemberDto dto = MemberDto.builder()
            .id(member.getId())
            .role(role) // 토큰 role 사용(또는 member.getRole())
            .nickname(member.getNickname())
            .email(member.getEmail())
            .profileImageUrl(member.getProfileImageUrl())
            .socialId(member.getSocialId())
            .build();

        // JWT 기반 요청이므로 attributes는 비어있는 Map
        CustomOAuth2User principal = new CustomOAuth2User(dto, Map.of());

        // 7) SecurityContext에 Authentication 설정
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}
