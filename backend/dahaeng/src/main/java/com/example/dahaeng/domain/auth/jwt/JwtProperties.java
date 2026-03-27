package com.example.dahaeng.domain.auth.jwt;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "spring.jwt")
public class JwtProperties {

    private String secret;
    private long accessExpiration;
    private long refreshExpiration;
}
