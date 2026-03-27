package com.example.dahaeng.domain.interest.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TravelTagInferenceResponse {
    private List<TravelTagScore> tags;
}
