package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class OpenAiRecommendationNarrationService implements RecommendationNarrationService {

    private final ChatClient.Builder chatClientBuilder;

    @Override
    public String generateReason(
            CityRankResult city,
            List<RecommendCitiesResponse.RecommendedPlace> places,
            List<String> selectedTags,
            String newsSummary
    ) {
        long narrationStart = System.nanoTime();
        String placeNames = places.stream()
                .map(RecommendCitiesResponse.RecommendedPlace::placeName)
                .toList()
                .toString();

        try {
            String content = chatClientBuilder.build()
                    .prompt()
                    .system("너는 여행 추천 설명 문구를 만드는 도우미다. 사용자가 이해하기 쉽게 2문장 이내로 짧고 자연스럽게 작성한다.")
                    .user("""
                            사용자 취향: %s
                            국가: %s
                            도시: %s
                            총점: %.1f
                            예산 점수: %.1f
                            안전 점수: %.1f
                            태그 점수: %.1f
                            뉴스 패널티: %.1f
                            추천 관광지: %s
                            뉴스 요약: %s

                            위 정보를 바탕으로 왜 이 도시가 추천되는지 간결한 추천 이유를 작성해줘.
                            """.formatted(
                            selectedTags,
                            city.countryName(),
                            city.cityName(),
                            city.totalScore(),
                            city.budgetScore(),
                            city.safetyScore(),
                            city.tagScore(),
                            city.newsPenaltyScore(),
                            placeNames,
                            newsSummary
                    ))
                    .call()
                    .content();

            if (StringUtils.hasText(content)) {
                log.info("recommendNarration cityId={} city={} narrationMs={}", city.cityId(), city.cityName(), elapsedMs(narrationStart));
                return content.trim();
            }
        } catch (Exception ignored) {
        }

        log.info("recommendNarration cityId={} city={} narrationMs={} fallback=true", city.cityId(), city.cityName(), elapsedMs(narrationStart));
        return "사용자 취향과 예산, 안전성과 관광지 매력을 종합했을 때 추천도가 높은 도시입니다.";
    }

    private long elapsedMs(long startNano) {
        return (System.nanoTime() - startNano) / 1_000_000;
    }
}
