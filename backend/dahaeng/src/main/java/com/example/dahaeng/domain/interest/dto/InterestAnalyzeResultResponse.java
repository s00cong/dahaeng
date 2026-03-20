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
public class InterestAnalyzeResultResponse {
    private List<InterestTagResponse> tags;
    private List<InterestKeywordResponse> topKeywords;
}
