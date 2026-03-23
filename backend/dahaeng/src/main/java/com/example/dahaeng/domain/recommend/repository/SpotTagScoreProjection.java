package com.example.dahaeng.domain.recommend.repository;

public interface SpotTagScoreProjection {
    Long getSpotId();
    String getTagName();
    Double getScore();
}
