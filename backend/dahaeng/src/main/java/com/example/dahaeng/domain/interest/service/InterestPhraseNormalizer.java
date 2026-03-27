package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.RawInterestSignal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterestPhraseNormalizer {

    private final Map<String, String> phraseNormalizationMap;

    public List<RawInterestSignal> normalizePhrases(List<RawInterestSignal> signals) {
        if (signals == null || signals.isEmpty()) return signals;

        List<Map.Entry<String, String>> sortedPhrases = phraseNormalizationMap.entrySet().stream()
                .sorted((e1, e2) -> Integer.compare(e2.getKey().length(), e1.getKey().length()))
                .collect(Collectors.toList());

        List<RawInterestSignal> result = new ArrayList<>();
        for (RawInterestSignal signal : signals) {
            String text = signal.getRawText();
            if (text == null || text.isBlank()) continue;

            String normalized = applySafePhraseProtection(text, sortedPhrases);
            
            result.add(RawInterestSignal.builder()
                    .rawText(normalized)
                    .sourceType(signal.getSourceType())
                    .videoId(signal.getVideoId())
                    .playlistId(signal.getPlaylistId())
                    .signalTime(signal.getSignalTime()) // 시점 정보 전달
                    .build());
        }
        return result;
    }

    private String applySafePhraseProtection(String text, List<Map.Entry<String, String>> sortedPhrases) {
        String out = text;
        for (Map.Entry<String, String> entry : sortedPhrases) {
            String target = entry.getKey();
            String replacement = entry.getValue();
            String regex = "(?<![\\p{L}\\p{N}_])" + Pattern.quote(target) + "(?![\\p{L}\\p{N}_])";
            out = out.replaceAll(regex, replacement);
        }
        return out;
    }
}
