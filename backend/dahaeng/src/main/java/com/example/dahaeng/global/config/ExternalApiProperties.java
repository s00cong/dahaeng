package com.example.dahaeng.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "external")
public record ExternalApiProperties(
        NewsApi newsapi,
        GooglePlaces googlePlaces
) {
    public record NewsApi(String key, String baseUrl) {}

    public record GooglePlaces(String key, String baseUrl) {}
}
