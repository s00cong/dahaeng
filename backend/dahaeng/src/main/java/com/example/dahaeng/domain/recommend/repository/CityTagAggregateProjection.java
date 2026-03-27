package com.example.dahaeng.domain.recommend.repository;

public interface CityTagAggregateProjection {
    Long getCityId();
    Long getMatchedSpotCount();
    Double getMatchedScoreSum();
}
