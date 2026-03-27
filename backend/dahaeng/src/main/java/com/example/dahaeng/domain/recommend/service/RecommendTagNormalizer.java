package com.example.dahaeng.domain.recommend.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

public final class RecommendTagNormalizer {

    private static final Map<String, String> API_TO_DB_TAG = Map.ofEntries(
            Map.entry("food", "미식탐방"),
            Map.entry("nature", "초록대자연"),
            Map.entry("city", "도시의밤"),
            Map.entry("art", "예술과전시"),
            Map.entry("beach", "푸른바다"),
            Map.entry("healing", "여유로운"),
            Map.entry("history", "역사속으로"),
            Map.entry("shopping", "쇼핑중독"),
            Map.entry("activity", "액티비티"),
            Map.entry("photo", "사진에진심"),
            Map.entry("local", "로컬감성"),
            Map.entry("luxury", "럭셔리한"),
            Map.entry("quiet", "조용한"),
            Map.entry("traditional", "전통적인"),
            Map.entry("romantic", "연인과"),
            Map.entry("friends", "친구와"),
            Map.entry("family", "가족과"),
            Map.entry("solo", "나홀로")
    );

    private RecommendTagNormalizer() {
    }

    public static List<String> normalize(List<String> selectedTags) {
        if (selectedTags == null || selectedTags.isEmpty()) {
            return List.of();
        }

        Map<String, String> normalized = new LinkedHashMap<>();
        for (String selectedTag : selectedTags) {
            if (selectedTag == null || selectedTag.isBlank()) {
                continue;
            }

            String trimmed = selectedTag.trim();
            String mapped = API_TO_DB_TAG.get(trimmed.toLowerCase(Locale.ROOT));
            String value = mapped != null ? mapped : trimmed;
            normalized.putIfAbsent(value, value);
        }

        return normalized.values().stream()
                .filter(Objects::nonNull)
                .toList();
    }
}
