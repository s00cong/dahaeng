package com.example.dahaeng.domain.interest.dto;

import com.example.dahaeng.domain.interest.enums.InterestSourceType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterestKeywordCandidate {
    private String rawKeyword;
    private String normalizedKeyword;

    // 분석 점수 (Runtime Only)
    private double score;            // 최종 중요도
    private double confidence;       // 데이터 신뢰도 (0~1)
    private double travelRelevance;  // 여행 도메인 연관성 (0~1)

    private int totalCount;
    private int distinctSourceCount;
    private LocalDateTime latestSignalTime;
    
    // 소스별 상세 통계
    private Map<InterestSourceType, Integer> sourceCounts;
    private Set<InterestSourceType> sourceTypes;
    private InterestSourceType sourceType; // 대표 소스 (기존 호환용)
}
