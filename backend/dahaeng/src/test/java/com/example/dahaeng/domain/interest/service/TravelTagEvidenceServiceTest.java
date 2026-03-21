package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.EvidenceKeywordResponse;
import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.SourceBadgeResponse;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import com.example.dahaeng.domain.interest.enums.InterestSourceType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TravelTagEvidenceServiceTest {

    private final TravelTagEvidenceService evidenceService = new TravelTagEvidenceService(new ObjectMapper());

    @Test
    void buildEvidenceKeywords_ignoresInvalidIds() {
        TravelTagScore tagScore = TravelTagScore.builder()
                .tag("야경")
                .category("Vibe")
                .evidenceKeywordIds(List.of(1, 3, 9))
                .build();

        List<InterestKeywordCandidate> aiKeywords = List.of(
                keyword("도시 야경", InterestSourceType.PLAYLIST_TITLE, 0.9),
                keyword("브이로그", InterestSourceType.LIKED_VIDEO_TAG, 0.8),
                keyword("서울 여행", InterestSourceType.SUBSCRIPTION_TITLE, 0.7)
        );

        List<EvidenceKeywordResponse> evidenceKeywords = evidenceService.buildEvidenceKeywords(tagScore, aiKeywords);

        assertThat(evidenceKeywords).hasSize(2);
        assertThat(evidenceKeywords).extracting(EvidenceKeywordResponse::getKeyword)
                .containsExactly("도시 야경", "서울 여행");
    }

    @Test
    void buildSourceBadges_normalizesTopSourcesTo100Percent() {
        List<EvidenceKeywordResponse> evidenceKeywords = List.of(
                evidence("도시 야경", "PLAYLIST_TITLE", 0.9),
                evidence("서울 야경", "PLAYLIST_TITLE", 0.8),
                evidence("브이로그", "LIKED_VIDEO_TAG", 0.7),
                evidence("감성 여행", "SUBSCRIPTION_TITLE", 0.6)
        );

        List<SourceBadgeResponse> badges = evidenceService.buildSourceBadges(evidenceKeywords);

        assertThat(badges).hasSize(3);
        int totalPercent = badges.stream().mapToInt(SourceBadgeResponse::getPercent).sum();
        assertThat(totalPercent).isEqualTo(100);
        assertThat(badges.get(0).getSourceType()).isEqualTo("PLAYLIST_TITLE");
        assertThat(badges.get(0).getPercent()).isEqualTo(50);
    }

    @Test
    void readWriteJson_roundTrips() {
        List<EvidenceKeywordResponse> evidenceKeywords = List.of(
                evidence("도시 야경", "PLAYLIST_TITLE", 0.9)
        );
        List<SourceBadgeResponse> sourceBadges = List.of(
                SourceBadgeResponse.builder().sourceType("PLAYLIST_TITLE").percent(100).build()
        );

        String evidenceJson = evidenceService.writeEvidenceKeywordsJson(evidenceKeywords);
        String sourceJson = evidenceService.writeSourceBadgesJson(sourceBadges);

        assertThat(evidenceService.readEvidenceKeywordsJson(evidenceJson))
                .extracting(EvidenceKeywordResponse::getKeyword)
                .containsExactly("도시 야경");
        assertThat(evidenceService.readSourceBadgesJson(sourceJson))
                .extracting(SourceBadgeResponse::getPercent)
                .containsExactly(100);
    }

    private InterestKeywordCandidate keyword(String keyword, InterestSourceType sourceType, double score) {
        return InterestKeywordCandidate.builder()
                .normalizedKeyword(keyword)
                .sourceType(sourceType)
                .score(score)
                .build();
    }

    private EvidenceKeywordResponse evidence(String keyword, String sourceType, double score) {
        return EvidenceKeywordResponse.builder()
                .keyword(keyword)
                .sourceType(sourceType)
                .score(score)
                .build();
    }
}
