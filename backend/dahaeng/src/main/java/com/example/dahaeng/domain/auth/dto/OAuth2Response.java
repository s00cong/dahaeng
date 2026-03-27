package com.example.dahaeng.domain.auth.dto;

public interface OAuth2Response {

    // 제공자 (Ex. naver, google, ...)
    String getProvider();

    // 제공자에서 발급받은 고유 ID
    String getProviderId();

    // 이메일
    String getEmail();

    // 사용자 이름(설정된 이름)
    String getName();

    // 사용자 프로필 이미지 URL
    String getProfileImageUrl();
}
