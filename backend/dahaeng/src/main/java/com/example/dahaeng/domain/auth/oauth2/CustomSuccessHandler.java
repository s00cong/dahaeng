package com.example.dahaeng.domain.auth.oauth2;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.auth.service.OAuthCodeService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class CustomSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final OAuthCodeService oAuthCodeService;

    @Value("${app.front-callback-url}")
    private String frontCallbackUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        CustomOAuth2User principal = (CustomOAuth2User) authentication.getPrincipal();

        // 1회용 code 발급 (30~60초 만료 권장)
        String code = oAuthCodeService.issueCode(principal);

        // 프론트(또는 현재 설정된 URL)로 redirect (토큰이 아니라 code 전달)
        response.sendRedirect(frontCallbackUrl + "?code=" + code);
    }
}
