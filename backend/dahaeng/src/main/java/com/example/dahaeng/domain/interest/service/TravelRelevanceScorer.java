package com.example.dahaeng.domain.interest.service;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.regex.Pattern;

import static java.util.Map.entry;

@Component
public class TravelRelevanceScorer {

    // 계층별 연관성 가중치
    private static final double REL_HIGH = 1.0;    // 직접적인 여행지/활동
    private static final double REL_MEDIUM = 0.7;  // 맛집, 카페, 문화
    private static final double REL_WEAK = 0.4;    // 일반 브이로그, 정보성
    private static final double REL_DEFAULT = 0.15; // 무관한 일반 관심사

    // Map.of는 10개까지만 가능하므로 Map.ofEntries 사용
    private static final Map<String, Double> RELEVANCE_DICT = Map.ofEntries(
        entry("제주", REL_HIGH), entry("공항", REL_HIGH), entry("여권", REL_HIGH), entry("비행기", REL_HIGH),
        entry("맛집", REL_MEDIUM), entry("카페", REL_MEDIUM), entry("오마카세", REL_MEDIUM), entry("등산", REL_MEDIUM),
        entry("브이로그", REL_WEAK), entry("일상", REL_WEAK), entry("뉴스", REL_WEAK)
    );

    private static final Pattern TRAVEL_PATTERN = Pattern.compile(".*(여행|투어|관광|항공|호텔|스테이|리조트|랜드).*");

    public double calculate(String keyword) {
        if (keyword == null || keyword.isBlank()) return REL_DEFAULT;
        
        // 1. 사전 기반 매칭
        if (RELEVANCE_DICT.containsKey(keyword)) return RELEVANCE_DICT.get(keyword);
        
        // 2. 패턴 기반 매칭
        if (TRAVEL_PATTERN.matcher(keyword).matches()) return REL_HIGH;
        
        return REL_DEFAULT;
    }
}
