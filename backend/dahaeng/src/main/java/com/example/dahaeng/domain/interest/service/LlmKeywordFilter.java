package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class LlmKeywordFilter {
    private static final double MIN_SCORE = 2.0;
    private static final int MAX_KEYWORDS = 30;
    private static final Set<String> BLACKLIST = Set.of(
            "news", "sbs", "kbs", "mbc", "jtbc", "tvn", "source", "type", "format", 
            "person", "official", "video", "channel", "구독", "채널", "뉴스", "실시간", "라이브"
    );
    private static final List<Pattern> META_PATTERNS = List.of(
            Pattern.compile(".*뉴스.*"), Pattern.compile(".*공식.*"),
            Pattern.compile(".*live.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile(".*1부.*"), Pattern.compile(".*2부.*"),
            Pattern.compile(".*shorts.*", Pattern.CASE_INSENSITIVE)
    );

    public List<InterestKeywordCandidate> filter(List<InterestKeywordCandidate> keywords) {
        if (keywords == null) return Collections.emptyList();
        return keywords.stream()
                .filter(k -> k.getScore() >= MIN_SCORE)
                .filter(k -> k.getNormalizedKeyword() != null && k.getNormalizedKeyword().trim().length() > 1)
                .filter(k -> !k.getNormalizedKeyword().matches("\\d+"))
                .filter(k -> !BLACKLIST.contains(k.getNormalizedKeyword().toLowerCase().trim()))
                .filter(k -> META_PATTERNS.stream().noneMatch(p -> p.matcher(k.getNormalizedKeyword()).matches()))
                .sorted(Comparator.comparingDouble(InterestKeywordCandidate::getScore).reversed())
                .limit(MAX_KEYWORDS)
                .collect(Collectors.toList());
    }
}
