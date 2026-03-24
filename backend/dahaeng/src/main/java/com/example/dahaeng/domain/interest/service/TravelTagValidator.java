package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Component
public class TravelTagValidator {

    private static final Map<String, List<Pattern>> TAG_EVIDENCE_PATTERNS = Map.ofEntries(
            Map.entry(key("Activity", "미식탐방"), patterns(
                    "맛집", "음식", "요리", "먹방", "푸드", "food", "restaurant", "cafe", "카페", "디저트", "브런치", "미식", "gourmet", "cuisine"
            )),
            Map.entry(key("Activity", "쇼핑중독"), patterns(
                    "쇼핑", "shopping", "하울", "haul", "면세", "백화점", "아울렛", "브랜드", "명품", "지름", "구매"
            )),
            Map.entry(key("Activity", "액티비티"), patterns(
                    "액티비티", "activity", "체험", "adventure", "스포츠", "레저", "서핑", "스키", "다이빙", "트레킹", "등산", "캠핑"
            )),
            Map.entry(key("Activity", "예술과전시"), patterns(
                    "전시", "미술", "아트", "art", "갤러리", "뮤지엄", "museum", "공연", "오페라", "연극", "디자인", "박물관"
            )),
            Map.entry(key("Activity", "사진에진심"), patterns(
                    "사진", "포토", "photo", "촬영", "카메라", "필름", "인생샷", "뷰포인트", "전망대", "스냅"
            )),
            Map.entry(key("Activity", "배움이있는"), patterns(
                    "역사", "문화", "유적", "투어", "가이드", "강의", "class", "워크숍", "체험학습", "전통", "박물관", "교실"
            )),

            Map.entry(key("Vibe", "활기찬"), patterns(
                    "music", "song", "edm", "dj", "dance", "party", "club", "festival", "hiphop", "rock", "pop",
                    "alan", "walker", "guetta", "신나는", "파티", "클럽", "페스티벌", "음악", "공연", "댄스", "에너지", "활기"
            )),
            Map.entry(key("Vibe", "힙한"), patterns(
                    "힙", "hip", "street", "스트릿", "트렌디", "감성카페", "indie", "인디", "rooftop", "루프탑", "클럽", "바"
            )),
            Map.entry(key("Vibe", "여유로운"), patterns(
                    "힐링", "여유", "relax", "slow", "산책", "노을", "명상", "휴식", "chill", "조용", "느긋"
            )),
            Map.entry(key("Vibe", "로컬감성"), patterns(
                    "로컬", "현지", "골목", "시장", "동네", "local", "마켓", "전통시장", "숨은", "작은가게"
            )),
            Map.entry(key("Vibe", "럭셔리한"), patterns(
                    "럭셔리", "명품", "five\\s*star", "5성급", "호캉스", "프리미엄", "고급", "luxury", "파인다이닝", "suite"
            )),
            Map.entry(key("Vibe", "조용한"), patterns(
                    "조용", "quiet", "한적", "적막", "사색", "북카페", "독서", "힐링", "calm"
            )),
            Map.entry(key("Vibe", "전통적인"), patterns(
                    "전통", "한옥", "사찰", "절", "고궁", "유산", "heritage", "historic", "민속", "옛거리"
            ))
    );

    private static final List<Pattern> WHO_PATTERNS = patterns(
            "가족", "친구", "연인", "커플", "혼자", "나홀로", "부모님", "아이", "kids?", "solo", "family", "couple"
    );

    private static final List<Pattern> CLIMATE_PATTERNS = patterns(
            "여름", "겨울", "추운", "더운", "바다", "눈", "비", "날씨", "기온", "장마", "봄", "가을",
            "summer", "winter", "rain", "snow", "weather", "temperature", "climate"
    );

    public List<TravelTagScore> validate(List<TravelTagScore> tags, List<InterestKeywordCandidate> evidence) {
        if (tags == null) {
            return Collections.emptyList();
        }

        Set<String> evidenceKeywords = (evidence == null ? List.<InterestKeywordCandidate>of() : evidence).stream()
                .map(this::resolveKeyword)
                .filter(s -> s != null && !s.isBlank())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        return tags.stream()
                .map(t -> applyEvidenceScore(t, evidenceKeywords))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.groupingBy(TravelTagScore::getCategory))
                .values().stream()
                .flatMap(categoryTags -> categoryTags.stream()
                        .sorted(Comparator.comparingDouble(TravelTagScore::getScore).reversed())
                        .limit(3))
                .collect(Collectors.toList());
    }

    private TravelTagScore applyEvidenceScore(TravelTagScore tag, Set<String> keywords) {
        if (tag == null || tag.getCategory() == null || tag.getTag() == null) {
            return null;
        }

        String category = tag.getCategory();
        String tagName = tag.getTag();
        double evidenceFit = 1.0;

        if (category.equalsIgnoreCase("Who")) {
            boolean matchedWho = matchesAnyPattern(keywords, WHO_PATTERNS);
            evidenceFit = Math.min(evidenceFit, matchedWho ? 1.0 : 0.35);
            if (!matchedWho) {
                log.info(">>> [VALIDATOR WARN] 'Who' tag '{}' has weak direct evidence. Applying penalty.", tagName);
            }
        }

        if (category.equalsIgnoreCase("Climate")) {
            boolean matchedClimate = matchesAnyPattern(keywords, CLIMATE_PATTERNS);
            evidenceFit = Math.min(evidenceFit, matchedClimate ? 1.0 : 0.35);
            if (!matchedClimate) {
                log.info(">>> [VALIDATOR WARN] 'Climate' tag '{}' has weak climate evidence. Applying penalty.", tagName);
            }
        }

        List<Pattern> tagPatterns = TAG_EVIDENCE_PATTERNS.get(key(category, tagName));
        if (tagPatterns != null) {
            boolean matched = matchesAnyPattern(keywords, tagPatterns);
            evidenceFit = Math.min(evidenceFit, matched ? 1.0 : 0.4);
            if (!matched) {
                log.info(">>> [VALIDATOR WARN] '{}:{}' has weak tag-specific evidence. Applying penalty.", category, tagName);
            }
        }

        if (tagPatterns == null && !(category.equalsIgnoreCase("Who") || category.equalsIgnoreCase("Climate"))) {
            evidenceFit = Math.min(evidenceFit, 0.8);
        }

        double score = clampScore(tag.getScore());
        double confidence = clampScore(tag.getConfidence());
        tag.setScore(clampScore(score * 0.8 + evidenceFit * 0.2));
        tag.setConfidence(clampScore(confidence * 0.85 + evidenceFit * 0.15));
        return tag;
    }

    private String resolveKeyword(InterestKeywordCandidate candidate) {
        if (candidate == null) {
            return null;
        }
        if (candidate.getNormalizedKeyword() != null && !candidate.getNormalizedKeyword().isBlank()) {
            return candidate.getNormalizedKeyword();
        }
        return candidate.getRawKeyword();
    }

    private boolean matchesAnyPattern(Set<String> keywords, List<Pattern> patterns) {
        if (keywords.isEmpty() || patterns == null || patterns.isEmpty()) {
            return false;
        }
        for (String keyword : keywords) {
            for (Pattern pattern : patterns) {
                if (pattern.matcher(keyword).find()) {
                    return true;
                }
            }
        }
        return false;
    }

    private static String key(String category, String tag) {
        return (category == null ? "" : category.trim().toLowerCase(Locale.ROOT))
                + ":"
                + (tag == null ? "" : tag.trim().toLowerCase(Locale.ROOT));
    }

    private static List<Pattern> patterns(String... terms) {
        return List.of(terms).stream()
                .map(term -> Pattern.compile(term, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE))
                .toList();
    }

    private double clampScore(Double value) {
        if (value == null || value.isNaN() || value.isInfinite()) {
            return 0.0;
        }
        if (value < 0.0) {
            return 0.0;
        }
        if (value > 1.0) {
            return 1.0;
        }
        return value;
    }
}
