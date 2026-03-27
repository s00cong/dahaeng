package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.enums.TravelTagCategory;
import java.util.List;
import java.util.Map;

/**
 * AI 분석에 필요한 허용 태그 목록과 카테고리 정보를 제공하는 인터페이스입니다.
 * 나중에 DB 기반으로 전환할 때 이 인터페이스의 구현체만 교체하면 됩니다.
 */
public interface TravelTagProvider {
    /**
     * AI 프롬프트에 포함될 '허용 태그 목록' 문자열을 생성합니다.
     */
    String getAllowedTagsPrompt();

    /**
     * 특정 카테고리와 태그가 유효한지 검증합니다.
     */
    boolean isValid(String categoryLabel, String tag);

    /**
     * 레이블 문자열로부터 TravelTagCategory 열거형을 반환합니다.
     */
    TravelTagCategory fromLabel(String label);

    /**
     * 모든 카테고리와 해당 태그 목록을 맵 형태로 반환합니다.
     */
    Map<TravelTagCategory, List<String>> getAllTagsMap();
}
