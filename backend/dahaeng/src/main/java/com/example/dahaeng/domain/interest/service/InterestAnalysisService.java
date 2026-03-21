package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.ExtractedInterestFeatures;
import com.example.dahaeng.domain.interest.dto.EvidenceKeywordResponse;
import com.example.dahaeng.domain.interest.dto.InterestAnalyzeResultResponse;
import com.example.dahaeng.domain.interest.dto.InterestKeywordResponse;
import com.example.dahaeng.domain.interest.dto.InterestAnalysisResult;
import com.example.dahaeng.domain.interest.dto.InterestTagResponse;
import com.example.dahaeng.domain.interest.dto.SourceBadgeResponse;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import com.example.dahaeng.domain.interest.repository.YoutubeInterestKeywordRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubeTravelTagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Interest Analysis Orchestrator
 * 트랜잭션 경계를 관리하고 각 엔진/클라이언트를 조합합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterestAnalysisService {

    private final KeywordExtractionEngine extractionEngine;
    private final TravelTagInferenceClient aiClient;
    private final TravelTagValidator validator;
    private final InterestResultSaver saver;
    private final YouTubeTravelTagRepository youTubeTravelTagRepository;
    private final YoutubeInterestKeywordRepository youtubeInterestKeywordRepository;
    private final TravelTagEvidenceService travelTagEvidenceService;

    public InterestAnalysisResult analyze(Long accountId) {
        log.info(">>> [COORDINATOR] Starting orchestrated analysis for account: {}", accountId);

        // Phase 1: Feature Engineering (Short Read-only Transaction)
        ExtractedInterestFeatures features = extractionEngine.extractFeatures(accountId);

        // Phase 2: AI Inference (No Transaction - DB Connection Released)
        List<TravelTagScore> rawTags = aiClient.inferTags(features.getTop30ForAi());

        // Phase 3: Evidence-based Validation (No Transaction)
        List<TravelTagScore> validatedTags = validator.validate(rawTags, features.getTop30ForAi());
        log.info(">>> [VALIDATION] {}/{} tags passed evidence check.", validatedTags.size(), rawTags.size());

        // Phase 4: Persistence (Short Write Transaction)
        saveFinalResults(features, validatedTags);

        return InterestAnalysisResult.builder()
                .accountId(accountId)
                .keywords(features.getAllKeywords())
                .travelTags(validatedTags)
                .build();
    }

    private void saveFinalResults(ExtractedInterestFeatures features, List<TravelTagScore> validatedTags) {
        saver.save(features.getAccountId(), features.getAllKeywords(), features.getTop30ForAi(), validatedTags);

        log.info(">>> [Phase 3] All results successfully persisted to DB.");
    }

    public List<InterestTagResponse> getAnalyzedTags(Long accountId) {
        return youTubeTravelTagRepository.findAllByAccountIdWithTag(accountId).stream()
                .map(tag -> InterestTagResponse.builder()
                        .tagId(tag.getTag() != null ? tag.getTag().getId() : null)
                        .categoryName(resolveCategoryName(tag))
                        .tagName(resolveTagName(tag))
                        .score(tag.getScore())
                        .confidence(tag.getConfidence())
                        .reason(tag.getReason())
                        .evidenceKeywords(readEvidenceKeywords(tag.getEvidenceKeywordsJson()))
                        .sourceBadges(readSourceBadges(tag.getSourceBadgesJson()))
                        .build())
                .toList();
    }

    public InterestAnalyzeResultResponse getAnalyzeResult(Long accountId) {
        List<InterestTagResponse> tags = getAnalyzedTags(accountId);
        List<InterestKeywordResponse> topKeywords = youtubeInterestKeywordRepository
                .findTop60ByAccount_IdOrderByScoreDesc(accountId).stream()
                .map(keyword -> InterestKeywordResponse.builder()
                        .keyword(keyword.getKeyword())
                        .normalizedKeyword(keyword.getNormalizedKeyword())
                        .sourceType(keyword.getSourceType() != null ? keyword.getSourceType().name() : null)
                        .score(keyword.getScore())
                        .build())
                .toList();

        return InterestAnalyzeResultResponse.builder()
                .tags(tags)
                .topKeywords(topKeywords)
                .build();
    }

    private String resolveCategoryName(com.example.dahaeng.domain.youtube.entity.YouTubeTravelTag tag) {
        if (tag.getTag() != null && tag.getTag().getCategory() != null) {
            return tag.getTag().getCategory().getName();
        }
        return tag.getCategoryName();
    }

    private String resolveTagName(com.example.dahaeng.domain.youtube.entity.YouTubeTravelTag tag) {
        if (tag.getTag() != null) {
            return tag.getTag().getName();
        }
        return tag.getTagName();
    }

    private List<EvidenceKeywordResponse> readEvidenceKeywords(String json) {
        return travelTagEvidenceService.readEvidenceKeywordsJson(json);
    }

    private List<SourceBadgeResponse> readSourceBadges(String json) {
        return travelTagEvidenceService.readSourceBadgesJson(json);
    }
}
