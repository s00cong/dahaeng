package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TravelTagValidatorTest {

    private final TravelTagValidator validator = new TravelTagValidator();

    @Test
    void keepsFoodTagButPenalizesWhenOnlyMusicKeywordsExist() {
        List<TravelTagScore> tags = List.of(
                TravelTagScore.builder().category("Activity").tag("\uBBF8\uC2DD\uD0D0\uBC29").score(0.9).confidence(0.9).build()
        );

        List<InterestKeywordCandidate> evidence = List.of(
                keyword("music"),
                keyword("song"),
                keyword("alan walker")
        );

        List<TravelTagScore> result = validator.validate(tags, evidence);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTag()).isEqualTo("\uBBF8\uC2DD\uD0D0\uBC29");
        assertThat(result.get(0).getScore()).isLessThan(0.9);
        assertThat(result.get(0).getConfidence()).isLessThan(0.9);
    }

    @Test
    void keepsVibeActiveWhenMusicKeywordsExist() {
        List<TravelTagScore> tags = List.of(
                TravelTagScore.builder().category("Vibe").tag("\uD65C\uAE30\uCC2C").score(0.88).confidence(0.84).build()
        );

        List<InterestKeywordCandidate> evidence = List.of(
                keyword("music"),
                keyword("party mix"),
                keyword("edm")
        );

        List<TravelTagScore> result = validator.validate(tags, evidence);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTag()).isEqualTo("\uD65C\uAE30\uCC2C");
        assertThat(result.get(0).getScore()).isGreaterThan(0.88);
    }

    @Test
    void keepsFoodTagWhenFoodKeywordsExist() {
        List<TravelTagScore> tags = List.of(
                TravelTagScore.builder().category("Activity").tag("\uBBF8\uC2DD\uD0D0\uBC29").score(0.86).confidence(0.83).build()
        );

        List<InterestKeywordCandidate> evidence = List.of(
                keyword("food"),
                keyword("food vlog"),
                keyword("restaurant")
        );

        List<TravelTagScore> result = validator.validate(tags, evidence);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTag()).isEqualTo("\uBBF8\uC2DD\uD0D0\uBC29");
        assertThat(result.get(0).getScore()).isGreaterThan(0.86);
    }

    @Test
    void keepsHipTagForPopSongTasteWithPenaltyIfWeakEvidence() {
        List<TravelTagScore> tags = List.of(
                TravelTagScore.builder().category("Vibe").tag("\uD799\uD55C").score(0.82).confidence(0.8).build()
        );

        List<InterestKeywordCandidate> evidence = List.of(
                keyword("pop song"),
                keyword("playlist"),
                keyword("music")
        );

        List<TravelTagScore> result = validator.validate(tags, evidence);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTag()).isEqualTo("\uD799\uD55C");
    }

    private InterestKeywordCandidate keyword(String normalizedKeyword) {
        return InterestKeywordCandidate.builder()
                .normalizedKeyword(normalizedKeyword)
                .build();
    }
}