package com.example.dahaeng.domain.interest.dto;

import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TravelTagScore {
    private String tag;
    private String category;
    private Double score;
    private Double confidence;
    private String reason;
    private List<Integer> evidenceKeywordIds;

    public TravelTagScore(String tag, String category, Double score, Double confidence, String reason) {
        this(tag, category, score, confidence, reason, null);
    }
}
