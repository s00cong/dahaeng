package com.example.dahaeng.domain.recommend.repository;

public interface SpotRecommendationProjection {
    Long getSpotId();
    Long getCityId();
    String getPlaceName();
    String getDescription();
    String getImageUrl();
    String getAddress();
    String getWebsiteUrl();
    String getSocialUrl();
    Double getLat();
    Double getLon();
    Double getMatchScore();
}
