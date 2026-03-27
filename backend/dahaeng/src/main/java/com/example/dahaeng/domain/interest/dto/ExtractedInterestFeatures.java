package com.example.dahaeng.domain.interest.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class ExtractedInterestFeatures {
    private final Long accountId;
    private final List<InterestKeywordCandidate> allKeywords;
    private final List<InterestKeywordCandidate> top30ForAi;
}
