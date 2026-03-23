package com.example.dahaeng.domain.interest.constant;

import com.example.dahaeng.domain.interest.enums.TravelTagCategory;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class TravelTagCatalog {
    private TravelTagCatalog() {}

    public static final Map<TravelTagCategory, List<String>> ALLOWED_TAGS;

    static {
        Map<TravelTagCategory, List<String>> map = new LinkedHashMap<>();
        map.put(TravelTagCategory.VIBE, List.of("여유로운", "힙한", "로컬감성", "활기찬", "럭셔리한", "조용한", "전통적인"));
        map.put(TravelTagCategory.LANDSCAPE, List.of("도시의밤", "푸른바다", "초록대자연", "역사속으로", "눈부신설원", "이국적인"));
        map.put(TravelTagCategory.ACTIVITY, List.of("미식탐방", "쇼핑중독", "액티비티", "예술과전시", "사진에진심", "배움이있는"));
        map.put(TravelTagCategory.WHO, List.of("나홀로", "연인과", "친구와", "가족과"));
        map.put(TravelTagCategory.CLIMATE, List.of("따뜻한곳", "추운곳", "눈과함께", "사계절", "건조한", "습한", "열대", "온화한"));
        ALLOWED_TAGS = Collections.unmodifiableMap(map);
    }

    public static boolean isValid(String categoryLabel, String tag) {
        if (categoryLabel == null || tag == null) {
            return false;
        }

        TravelTagCategory category = TravelTagCategory.fromLabel(categoryLabel);
        if (category == null) {
            return false;
        }

        return ALLOWED_TAGS.getOrDefault(category, List.of()).contains(tag.trim());
    }

    public static String getAllowedTagsPrompt() {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");

        int categoryIndex = 0;
        int totalCategories = ALLOWED_TAGS.size();

        for (Map.Entry<TravelTagCategory, List<String>> entry : ALLOWED_TAGS.entrySet()) {
            sb.append("  \"")
                    .append(entry.getKey().getLabel())
                    .append("\": [");

            List<String> tags = entry.getValue();
            for (int i = 0; i < tags.size(); i++) {
                sb.append("\"").append(tags.get(i)).append("\"");
                if (i < tags.size() - 1) {
                    sb.append(", ");
                }
            }

            sb.append("]");
            if (categoryIndex < totalCategories - 1) {
                sb.append(",");
            }
            sb.append("\n");

            categoryIndex++;
        }

        sb.append("}");
        return sb.toString();
    }
}