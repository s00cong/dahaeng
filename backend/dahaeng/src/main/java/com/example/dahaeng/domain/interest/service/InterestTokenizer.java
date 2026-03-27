package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.RawInterestSignal;
import com.example.dahaeng.domain.interest.dto.TokenizedSignal;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class InterestTokenizer {

    private final Set<String> stopwords;

    public InterestTokenizer(@Qualifier("stopwords") Set<String> stopwords) {
        this.stopwords = stopwords;
    }

    public List<TokenizedSignal> tokenize(List<RawInterestSignal> signals) {
        List<TokenizedSignal> result = new ArrayList<>();
        
        for (RawInterestSignal signal : signals) {
            String text = signal.getRawText();
            if (text == null || text.isBlank()) continue;

            String cleaned = text.replaceAll("[^\\p{L}\\p{N}_\\s]", " ").toLowerCase();
            String[] tokens = cleaned.split("\\s+");

            for (String token : tokens) {
                if (token.isBlank()) continue;
                String trimmed = trimKoreanSuffix(token);

                if (trimmed.matches("\\d+")) continue; 
                if (stopwords.contains(trimmed)) continue; 
                if (trimmed.length() <= 1) continue; 

                result.add(TokenizedSignal.builder()
                        .rawToken(trimmed)
                        .sourceType(signal.getSourceType())
                        .signalTime(signal.getSignalTime()) // 시점 정보 전달
                        .build());
            }
        }
        return result;
    }

    private String trimKoreanSuffix(String token) {
        if (token.contains("_")) return token;
        for (String suffix : KOREAN_SUFFIXES) {
            if (token.endsWith(suffix) && token.length() > suffix.length() + 1) {
                return token.substring(0, token.length() - suffix.length());
            }
        }
        return token;
    }

    private static final List<String> KOREAN_SUFFIXES = List.of(
            "에서", "으로", "은", "는", "이", "가", "을", "를", "에", "의", "도", "와", "과"
    );
}
