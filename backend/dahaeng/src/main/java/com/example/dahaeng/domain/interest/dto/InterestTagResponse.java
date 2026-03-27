package com.example.dahaeng.domain.interest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterestTagResponse {
    private Long tagId;
    private String categoryName;
    private String tagName;
    private Double score;
    private Double confidence;
    private String reason;
    private List<EvidenceKeywordResponse> evidenceKeywords;
    private List<SourceBadgeResponse> sourceBadges;
}
