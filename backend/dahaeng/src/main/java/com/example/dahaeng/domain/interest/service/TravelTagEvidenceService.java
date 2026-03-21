package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.EvidenceKeywordResponse;
import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.SourceBadgeResponse;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TravelTagEvidenceService {

    private static final TypeReference<List<EvidenceKeywordResponse>> EVIDENCE_KEYWORDS_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<SourceBadgeResponse>> SOURCE_BADGES_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    public List<EvidenceKeywordResponse> buildEvidenceKeywords(TravelTagScore tagScore, List<InterestKeywordCandidate> aiKeywords) {
        if (tagScore == null || aiKeywords == null || aiKeywords.isEmpty()) {
            return Collections.emptyList();
        }

        List<Integer> evidenceKeywordIds = tagScore.getEvidenceKeywordIds();
        if (evidenceKeywordIds == null || evidenceKeywordIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<EvidenceKeywordResponse> evidenceKeywords = new ArrayList<>();
        for (Integer evidenceKeywordId : evidenceKeywordIds) {
            if (evidenceKeywordId == null || evidenceKeywordId <= 0 || evidenceKeywordId > aiKeywords.size()) {
                continue;
            }

            InterestKeywordCandidate candidate = aiKeywords.get(evidenceKeywordId - 1);
            evidenceKeywords.add(EvidenceKeywordResponse.builder()
                    .keyword(resolveKeyword(candidate))
                    .sourceType(candidate.getSourceType() != null ? candidate.getSourceType().name() : null)
                    .score(candidate.getScore())
                    .build());
        }
        return evidenceKeywords;
    }

    public List<SourceBadgeResponse> buildSourceBadges(List<EvidenceKeywordResponse> evidenceKeywords) {
        if (evidenceKeywords == null || evidenceKeywords.size() < 2) {
            return Collections.emptyList();
        }

        Map<String, Integer> sourceCounts = new LinkedHashMap<>();
        for (EvidenceKeywordResponse evidenceKeyword : evidenceKeywords) {
            if (evidenceKeyword.getSourceType() == null || evidenceKeyword.getSourceType().isBlank()) {
                continue;
            }
            sourceCounts.merge(evidenceKeyword.getSourceType(), 1, Integer::sum);
        }

        if (sourceCounts.isEmpty()) {
            return Collections.emptyList();
        }

        List<Map.Entry<String, Integer>> sortedCounts = sourceCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed()
                        .thenComparing(Map.Entry::getKey))
                .limit(3)
                .toList();

        int top3Total = sortedCounts.stream().mapToInt(Map.Entry::getValue).sum();
        if (top3Total <= 0) {
            return Collections.emptyList();
        }

        List<SourceBadgeResponse> badges = new ArrayList<>();
        int assigned = 0;
        for (int i = 0; i < sortedCounts.size(); i++) {
            Map.Entry<String, Integer> entry = sortedCounts.get(i);
            int percent = (int) Math.round((entry.getValue() * 100.0) / top3Total);
            if (i == sortedCounts.size() - 1) {
                percent = Math.max(0, 100 - assigned);
            }
            assigned += percent;
            badges.add(SourceBadgeResponse.builder()
                    .sourceType(entry.getKey())
                    .percent(percent)
                    .build());
        }

        return badges.stream()
                .sorted(Comparator.comparingInt(SourceBadgeResponse::getPercent).reversed()
                        .thenComparing(SourceBadgeResponse::getSourceType))
                .toList();
    }

    public String writeEvidenceKeywordsJson(List<EvidenceKeywordResponse> evidenceKeywords) {
        return writeJson(evidenceKeywords);
    }

    public String writeSourceBadgesJson(List<SourceBadgeResponse> sourceBadges) {
        return writeJson(sourceBadges);
    }

    public List<EvidenceKeywordResponse> readEvidenceKeywordsJson(String json) {
        return readJson(json, EVIDENCE_KEYWORDS_TYPE);
    }

    public List<SourceBadgeResponse> readSourceBadgesJson(String json) {
        return readJson(json, SOURCE_BADGES_TYPE);
    }

    private String resolveKeyword(InterestKeywordCandidate candidate) {
        if (candidate.getNormalizedKeyword() != null && !candidate.getNormalizedKeyword().isBlank()) {
            return candidate.getNormalizedKeyword();
        }
        return candidate.getRawKeyword();
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn(">>> [TAG EVIDENCE WRITE FAIL] {}", e.getMessage());
            return "[]";
        }
    }

    private <T> List<T> readJson(String json, TypeReference<List<T>> typeReference) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, typeReference);
        } catch (JsonProcessingException e) {
            log.warn(">>> [TAG EVIDENCE READ FAIL] {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
