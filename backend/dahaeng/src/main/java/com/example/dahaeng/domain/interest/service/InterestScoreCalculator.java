package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.enums.InterestSourceType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterestScoreCalculator {

    private final TravelRelevanceScorer relevanceScorer;

    // 소스별 정교한 가중치 설정
    private static final Map<InterestSourceType, Double> SOURCE_WEIGHTS = Map.of(
        InterestSourceType.LIKED_VIDEO_TAG, 1.0,
        InterestSourceType.LIKED_VIDEO_TITLE, 0.9,
        InterestSourceType.PLAYLIST_VIDEO_TAG, 0.8,
        InterestSourceType.PLAYLIST_VIDEO_TITLE, 0.7,
        InterestSourceType.PLAYLIST_TITLE, 0.5,
        InterestSourceType.SUBSCRIPTION_TITLE, 0.3
    );

    public List<InterestKeywordCandidate> calculate(List<InterestKeywordCandidate> normalizedCandidates) {
        if (normalizedCandidates == null || normalizedCandidates.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, KeywordScoreModel> scoreModels = new HashMap<>();

        // 1. 키워드별 통합 모델 생성
        for (InterestKeywordCandidate candidate : normalizedCandidates) {
            String normKey = candidate.getNormalizedKeyword();
            KeywordScoreModel model = scoreModels.computeIfAbsent(normKey, k -> new KeywordScoreModel(normKey, candidate.getRawKeyword()));
            model.addOccurrence(candidate.getSourceType(), candidate.getLatestSignalTime());
        }

        // 2. 최종 점수 및 신뢰도 계산
        return scoreModels.values().stream()
                .map(this::calculateFinalCandidate)
                .sorted(Comparator.comparingDouble((InterestKeywordCandidate k) -> 
                    k.getScore() * k.getConfidence() * k.getTravelRelevance()).reversed())
                .collect(Collectors.toList());
    }

    private InterestKeywordCandidate calculateFinalCandidate(KeywordScoreModel model) {
        double baseScoreSum = 0.0;
        InterestSourceType representativeSource = null;
        double maxContribution = -1.0;

        // A. 소스별 가중치 합산 (Sqrt Damping 적용)
        for (Map.Entry<InterestSourceType, Integer> entry : model.sourceCounts.entrySet()) {
            double weight = SOURCE_WEIGHTS.getOrDefault(entry.getKey(), 0.2);
            double contribution = weight * Math.sqrt(entry.getValue());
            baseScoreSum += contribution;

            if (contribution > maxContribution) {
                maxContribution = contribution;
                representativeSource = entry.getKey();
            }
        }

        // B. 다양성 보너스 및 최신성 가중치
        double diversityBonus = 1.0 + (Math.min(model.getDistinctSourceCount(), 5) * 0.15);
        double recencyFactor = getRecencyFactor(model.latestSignalTime);

        // C. 여행 연관성 계산
        double relevance = relevanceScorer.calculate(model.normalizedKeyword);

        // D. 최종 점수 (중요도)
        double finalScore = baseScoreSum * diversityBonus * recencyFactor * (0.5 + relevance);

        // E. 신뢰도(Confidence) 계산
        // log 기반 빈도 점수(40%) + 소스 다양성(30%) + 최신성(30%)
        double frequencyConfidence = Math.min(1.0, Math.log10(model.getTotalCount() + 1) / 1.5);
        double sourceConfidence = Math.min(1.0, model.getDistinctSourceCount() / 4.0);
        double finalConfidence = (frequencyConfidence * 0.4) + (sourceConfidence * 0.3) + (recencyFactor * 0.3);

        return InterestKeywordCandidate.builder()
                .rawKeyword(model.representativeRawKeyword)
                .normalizedKeyword(model.normalizedKeyword)
                .score(finalScore)
                .confidence(finalConfidence)
                .travelRelevance(relevance)
                .sourceCounts(model.sourceCounts)
                .sourceTypes(model.sourceCounts.keySet())
                .sourceType(representativeSource)
                .totalCount(model.getTotalCount())
                .distinctSourceCount(model.getDistinctSourceCount())
                .latestSignalTime(model.latestSignalTime)
                .build();
    }

    private double getRecencyFactor(LocalDateTime time) {
        if (time == null) return 0.5;
        long days = ChronoUnit.DAYS.between(time, LocalDateTime.now());
        if (days <= 7) return 1.0;
        if (days <= 30) return 0.85;
        if (days <= 90) return 0.7;
        return 0.5;
    }

    private static class KeywordScoreModel {
        private final String normalizedKeyword;
        private final String representativeRawKeyword;
        private final Map<InterestSourceType, Integer> sourceCounts = new HashMap<>();
        private LocalDateTime latestSignalTime;
        
        public KeywordScoreModel(String normalizedKeyword, String rawKeyword) {
            this.normalizedKeyword = normalizedKeyword;
            this.representativeRawKeyword = rawKeyword;
        }

        public void addOccurrence(InterestSourceType source, LocalDateTime signalTime) {
            sourceCounts.put(source, sourceCounts.getOrDefault(source, 0) + 1);
            if (signalTime != null) {
                if (latestSignalTime == null || signalTime.isAfter(latestSignalTime)) {
                    latestSignalTime = signalTime;
                }
            }
        }

        public int getDistinctSourceCount() { return sourceCounts.size(); }
        public int getTotalCount() { return sourceCounts.values().stream().mapToInt(Integer::intValue).sum(); }
    }
}
