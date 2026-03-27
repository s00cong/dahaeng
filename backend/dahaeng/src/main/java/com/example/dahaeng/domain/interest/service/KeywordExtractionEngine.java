package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.ExtractedInterestFeatures;
import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class KeywordExtractionEngine {

    private static final int MAX_AI_KEYWORDS = 60;

    private final RawInterestSignalCollector collector;
    private final InterestTextCleaner cleaner;
    private final InterestPhraseNormalizer phraseNormalizer;
    private final InterestTokenizer tokenizer;
    private final InterestKeywordNormalizer normalizer;
    private final InterestScoreCalculator scoreCalculator;

    @Transactional(readOnly = true)
    public ExtractedInterestFeatures extractFeatures(Long accountId) {
        log.info(">>> [Phase 1] Collecting and scoring features for account: {}", accountId);

        var raw = collector.collect(accountId);
        var cleaned = cleaner.clean(raw);
        var phrased = phraseNormalizer.normalizePhrases(cleaned);
        var tokens = tokenizer.tokenize(phrased);
        var normalized = normalizer.normalize(tokens);
        
        List<InterestKeywordCandidate> scored = scoreCalculator.calculate(normalized);

        // AI용 상위 60개 추출 (시맨틱 랭킹 적용)
        List<InterestKeywordCandidate> top60 = scored.stream()
                .sorted(Comparator.comparingDouble((InterestKeywordCandidate k) -> 
                        k.getScore() * k.getConfidence() * k.getTravelRelevance()).reversed())
                .limit(MAX_AI_KEYWORDS)
                .toList();

        return ExtractedInterestFeatures.builder()
                .accountId(accountId)
                .allKeywords(scored)
                .top30ForAi(top60)
                .build();
    }
}
