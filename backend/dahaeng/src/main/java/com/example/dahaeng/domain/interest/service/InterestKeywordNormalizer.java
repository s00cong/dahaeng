package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.TokenizedSignal;
import com.example.dahaeng.domain.interest.enums.InterestSourceType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class InterestKeywordNormalizer {

    private final Map<String, String> synonymMap;

    public List<InterestKeywordCandidate> normalize(List<TokenizedSignal> tokens) {
        List<InterestKeywordCandidate> result = new ArrayList<>();
        for (TokenizedSignal token : tokens) {
            String raw = token.getRawToken();
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String trimmed = raw.trim();
            String normalized = synonymMap.getOrDefault(trimmed, trimmed);

            result.add(InterestKeywordCandidate.builder()
                    .rawKeyword(trimmed)
                    .normalizedKeyword(normalized)
                    .sourceType(token.getSourceType())
                    .sourceTypes(Set.of(token.getSourceType()))
                    .latestSignalTime(token.getSignalTime())
                    .score(0.0)
                    .totalCount(1)
                    .distinctSourceCount(1)
                    .build());
        }
        return result;
    }
}
