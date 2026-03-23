package com.example.dahaeng.domain.interest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterestKeywordResponse {
    private String keyword;
    private String normalizedKeyword;
    private String sourceType;
    private Double score;
}
