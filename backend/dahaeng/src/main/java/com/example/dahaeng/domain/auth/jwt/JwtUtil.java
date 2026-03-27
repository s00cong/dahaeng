package com.example.dahaeng.domain.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey secretKey;
    private final JwtProperties properties;

    public JwtUtil(JwtProperties properties) {
        this.properties = properties;

        if (properties.getSecret() == null || properties.getSecret().isBlank()) {
            throw new IllegalStateException("JWT secret is missing.");
        }

        this.secretKey = Keys.hmacShaKeyFor(
                Decoders.BASE64.decode(properties.getSecret())
        );
    }

    private Claims claims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public void validateToken(String token) {
        claims(token);
    }

    public String getCategory(String token) {
        return claims(token).get("category", String.class);
    }

    public Long getMemberId(String token) {
        String v = claims(token).get("memberId", String.class);
        return v == null ? null : Long.parseLong(v);
    }

    public String getRole(String token) {
        return claims(token).get("role", String.class);
    }

    public String createAccessToken(Long memberId, String role) {
        long now = System.currentTimeMillis();

        return Jwts.builder()
                .claim("category", "access")
                .claim("memberId", String.valueOf(memberId))
                .claim("role", role)
                .issuedAt(new Date(now))
                .expiration(new Date(now + properties.getAccessExpiration()))
                .signWith(secretKey)
                .compact();
    }

    public String createRefreshToken(Long memberId) {
        long now = System.currentTimeMillis();

        return Jwts.builder()
                .claim("category", "refresh")
                .claim("memberId", String.valueOf(memberId))
                .issuedAt(new Date(now))
                .expiration(new Date(now + properties.getRefreshExpiration()))
                .signWith(secretKey)
                .compact();
    }
}
