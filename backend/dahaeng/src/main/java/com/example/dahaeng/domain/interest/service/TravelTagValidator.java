package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
public class TravelTagValidator {

    public List<TravelTagScore> validate(List<TravelTagScore> tags, List<InterestKeywordCandidate> evidence) {
        if (tags == null) return Collections.emptyList();

        Set<String> evidenceKeywords = evidence.stream()
                .map(InterestKeywordCandidate::getNormalizedKeyword)
                .collect(Collectors.toSet());

        return tags.stream()
                // 1. 카테고리별 그룹화 및 정렬 후 상위 3개 선정
                .collect(Collectors.groupingBy(TravelTagScore::getCategory))
                .values().stream()
                .flatMap(categoryTags -> categoryTags.stream()
                        .sorted(Comparator.comparingDouble(TravelTagScore::getScore).reversed())
                        .limit(3))
                // 2. 특정 카테고리 증거 기반 필터링
                .filter(t -> validateWithEvidence(t, evidenceKeywords))
                .collect(Collectors.toList());
    }

    private boolean validateWithEvidence(TravelTagScore tag, Set<String> keywords) {
        // 'Who' 카테고리는 직접적인 키워드 증거가 있어야 함
        if (tag.getCategory().equalsIgnoreCase("Who")) {
            boolean hasWhoEvidence = keywords.stream().anyMatch(k -> k.matches(".*(가족|친구|연인|커플|혼자|나홀로|부모님|아이).*"));
            if (!hasWhoEvidence) {
                log.info(">>> [VALIDATOR REJECT] 'Who' tag '{}' rejected due to lack of direct keyword evidence.", tag.getTag());
                return false;
            }
        }
        
        // 'Climate' 카테고리는 기후 관련 맥락이 있어야 함
        if (tag.getCategory().equalsIgnoreCase("Climate")) {
            boolean hasClimateEvidence = keywords.stream().anyMatch(k -> k.matches(".*(여름|겨울|추운|더운|바다|눈|비|날씨|기온).*"));
            if (!hasClimateEvidence) {
                log.info(">>> [VALIDATOR REJECT] 'Climate' tag '{}' rejected due to lack of context keywords.", tag.getTag());
                return false;
            }
        }

        return true;
    }
}
