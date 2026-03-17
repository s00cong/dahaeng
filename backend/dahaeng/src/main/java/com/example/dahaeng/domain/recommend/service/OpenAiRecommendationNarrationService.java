package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@Primary
@RequiredArgsConstructor
public class OpenAiRecommendationNarrationService implements RecommendationNarrationService {

    private final ChatClient.Builder chatClientBuilder;

    @Override
    public String generateReason(
            CityRankResult city,
            List<RecommendCitiesResponse.RecommendedPlace> places,
            List<String> selectedTags,
            String newsSummary
    ) {
        String placeNames = places.stream()
                .map(RecommendCitiesResponse.RecommendedPlace::placeName)
                .toList()
                .toString();

        try {
            String content = chatClientBuilder.build()
                    .prompt()
                    .system("너는 여행 추천 서비스의 설명 생성기다. 한국어로만 2문장 이내로 답하고, 과장하지 마라.")
                    .user("""
                            사용자 태그: %s
                            국가: %s
                            도시: %s
                            총점: %.1f
                            예산 점수: %.1f
                            안전 점수: %.1f
                            태그 점수: %.1f
                            뉴스 페널티: %.1f
                            추천 관광지: %s
                            뉴스 요약: %s

                            위 정보만으로 왜 이 도시와 관광지가 추천되었는지 자연스럽게 설명해라.
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
                return content.trim();
            }
        } catch (Exception ignored) {
        }

        return "사용자 태그와 예산, 안전도, 관광지 매칭 결과를 종합했을 때 적합도가 높아 추천된 도시입니다.";
    }
}
