package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.RawInterestSignal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InterestTextCleaner {

    private static final String URL_REGEX = "https?://\\S+\\b";
    private static final String EMAIL_REGEX = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}";
    private static final String JAMO_REGEX = "[ㄱ-ㅎㅏ-ㅣ]+";
    private static final String SPECIAL_CHAR_REGEX = "[^\\p{L}\\p{N}_\\s]";

    public List<RawInterestSignal> clean(List<RawInterestSignal> signals) {
        List<RawInterestSignal> result = new ArrayList<>();
        
        for (RawInterestSignal signal : signals) {
            String raw = signal.getRawText();
            if (raw == null || raw.isBlank()) {
                continue;
            }

            String cleaned = raw.replaceAll(URL_REGEX, " ")
                              .replaceAll(EMAIL_REGEX, " ")
                              .replaceAll(JAMO_REGEX, " ")
                              .replaceAll(SPECIAL_CHAR_REGEX, " ")
                              .replaceAll("\\s+", " ")
                              .trim();

            if (cleaned.isEmpty()) {
                continue;
            }

            result.add(RawInterestSignal.builder()
                    .rawText(cleaned)
                    .sourceType(signal.getSourceType())
                    .videoId(signal.getVideoId())
                    .playlistId(signal.getPlaylistId())
                    .signalTime(signal.getSignalTime()) // 시점 정보 전달
                    .build());
        }
        return result;
    }
}
