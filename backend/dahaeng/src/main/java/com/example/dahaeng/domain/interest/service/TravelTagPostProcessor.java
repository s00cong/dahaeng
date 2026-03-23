package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class TravelTagPostProcessor {

    private final TravelTagProvider tagProvider;
    
    // 임계값을 낮추어 더 많은 추론 결과를 수용합니다.
    private static final double MIN_CONFIDENCE_THRESHOLD = 0.3; 
    private static final double MIN_SCORE_THRESHOLD = 0.3;      
    private static final int MAX_REASON_LENGTH = 150;
    private static final int MAX_EVIDENCE_KEYWORDS = 5;

    public List<TravelTagScore> process(List<TravelTagScore> tags) {
        if (tags == null) return Collections.emptyList();

        List<TravelTagScore> processed = new ArrayList<>();
        
        for (TravelTagScore t : tags) {
            // 1. Null 체크 및 유효성 검증
            if (t.getCategory() == null || t.getTag() == null) {
                log.info(">>> [REJECT] Null category or tag found in AI response.");
                continue;
            }
            
            String category = t.getCategory().trim();
            String tag = t.getTag().trim();
            
            if (!tagProvider.isValid(category, tag)) {
                log.info(">>> [REJECT] Tag '{}' in category '{}' is not in our allowed catalog.", tag, category);
                continue;
            }
            
            // 2. 점수 및 확신도 범위 검증 (0~1)
            if (!isValidRange(t.getScore()) || !isValidRange(t.getConfidence())) {
                log.info(">>> [REJECT] Invalid score/confidence range for tag '{}': score={}, conf={}", tag, t.getScore(), t.getConfidence());
                continue;
            }
            
            // 3. 임계값 필터링
            if (t.getConfidence() < MIN_CONFIDENCE_THRESHOLD || t.getScore() < MIN_SCORE_THRESHOLD) {
                log.info(">>> [REJECT] Tag '{}' below threshold: conf={} (min 0.3), score={} (min 0.3)", tag, t.getConfidence(), t.getScore());
                continue;
            }

            // 통과된 데이터 정제
            t.setCategory(category);
            t.setTag(tag);
            if (t.getReason() != null && t.getReason().length() > MAX_REASON_LENGTH) {
                t.setReason(t.getReason().substring(0, MAX_REASON_LENGTH));
            }
            t.setEvidenceKeywordIds(normalizeEvidenceKeywordIds(t.getEvidenceKeywordIds()));
            processed.add(t);
        }

        // 4. 중복 제거 (Category + Tag 기준) 및 최종 정렬
        return processed.stream()
                .collect(Collectors.toMap(
                        t -> t.getCategory() + ":" + t.getTag(),
                        t -> t,
                        (t1, t2) -> t1.getScore() > t2.getScore() ? t1 : t2
                ))
                .values().stream()
                .sorted(Comparator.comparingDouble(TravelTagScore::getScore).reversed())
                .limit(10)
                .collect(Collectors.toList());
    }

    private boolean isValidRange(Double v) {
        return v != null && v >= 0.0 && v <= 1.0;
    }

    private List<Integer> normalizeEvidenceKeywordIds(List<Integer> evidenceKeywordIds) {
        if (evidenceKeywordIds == null || evidenceKeywordIds.isEmpty()) {
            return Collections.emptyList();
        }

        return evidenceKeywordIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .limit(MAX_EVIDENCE_KEYWORDS)
                .collect(Collectors.toList());
    }
}
