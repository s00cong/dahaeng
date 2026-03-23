package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.constant.TravelTagCatalog;
import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TravelTagInferenceUnitTest {

    @Test
    @DisplayName("Catalog: 허용된 태그만 유효함을 확인한다")
    void catalogValidation() {
        assertThat(TravelTagCatalog.isValid("Vibe", "힙한")).isTrue();
        assertThat(TravelTagCatalog.isValid("Vibe", "이상한태그")).isFalse();
        assertThat(TravelTagCatalog.isValid("Climate", "눈과함께")).isTrue();
    }

    @Test
    @DisplayName("Filter: 블랙리스트 및 저점수 키워드를 성공적으로 제거한다")
    void keywordFilter() {
        LlmKeywordFilter filter = new LlmKeywordFilter();
        List<InterestKeywordCandidate> input = Arrays.asList(
            InterestKeywordCandidate.builder().normalizedKeyword("스프링부트").score(15.0).build(),
            InterestKeywordCandidate.builder().normalizedKeyword("SBS뉴스").score(50.0).build(),
            InterestKeywordCandidate.builder().normalizedKeyword("맛집").score(1.0).build()
        );
        List<InterestKeywordCandidate> result = filter.filter(input);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNormalizedKeyword()).isEqualTo("스프링부트");
    }

    @Test
    @DisplayName("PostProcessor: 중복 태그를 제거하고 점수 높은 것을 선택한다")
    void deduplication() {
        ConstantTravelTagProvider tagProvider = new ConstantTravelTagProvider();
        TravelTagPostProcessor processor = new TravelTagPostProcessor(tagProvider);
        
        List<TravelTagScore> input = Arrays.asList(
            new TravelTagScore("힙한", "Vibe", 0.9, 0.8, "Reason1"),
            new TravelTagScore("힙한", "Vibe", 0.7, 0.9, "Reason2")
        );
        List<TravelTagScore> result = processor.process(input);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getScore()).isEqualTo(0.9);
    }
}
