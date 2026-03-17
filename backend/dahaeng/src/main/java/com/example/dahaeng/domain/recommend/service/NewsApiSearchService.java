package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import com.example.dahaeng.global.config.ExternalApiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.List;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class NewsApiSearchService implements NewsSearchService {

    private final ExternalApiProperties externalApiProperties;
    private final RestClient.Builder restClientBuilder;
    private final ChatClient.Builder chatClientBuilder;

    @Override
    public RecommendCitiesResponse.NewsInsight searchAndSummarize(String city, String country, double newsPenaltyScore) {
        if (externalApiProperties.newsapi() == null || !StringUtils.hasText(externalApiProperties.newsapi().key())) {
            return new RecommendCitiesResponse.NewsInsight(
                    city + " 관련 뉴스 API 키가 없어 뉴스를 불러오지 못했습니다.",
                    List.of()
            );
        }

        RestClient restClient = restClientBuilder.baseUrl(externalApiProperties.newsapi().baseUrl()).build();
        String query = buildQuery(city, country, newsPenaltyScore);
        String uri = UriComponentsBuilder.fromPath("/v2/everything")
                .queryParam("q", query)
                .queryParam("language", "en")
                .queryParam("sortBy", "publishedAt")
                .queryParam("pageSize", 5)
                .queryParam("from", LocalDate.now().minusDays(7))
                .build()
                .toUriString();

        NewsApiResponse response;
        try {
            response = restClient.get()
                    .uri(uri)
                    .header("X-Api-Key", externalApiProperties.newsapi().key())
                    .retrieve()
                    .body(NewsApiResponse.class);
        } catch (Exception e) {
            log.warn("News API request failed for city={}, country={}: {}", city, country, e.getMessage(), e);
            return new RecommendCitiesResponse.NewsInsight(
                    city + " 관련 뉴스를 불러오지 못했습니다.",
                    List.of()
            );
        }

        List<ArticleItem> rawArticles = response == null || response.articles() == null
                ? List.of()
                : response.articles().stream().limit(5).toList();

        List<RecommendCitiesResponse.Article> articles = rawArticles.stream()
                .map(article -> new RecommendCitiesResponse.Article(
                        safe(article.title()),
                        safe(article.url()),
                        article.urlToImage(),
                        safe(article.description()),
                        safe(article.content()),
                        safe(article.publishedAt())
                ))
                .toList();

        String summary = summarizeArticles(city, country, newsPenaltyScore, rawArticles);
        return new RecommendCitiesResponse.NewsInsight(summary, articles);
    }

    private String buildQuery(String city, String country, double newsPenaltyScore) {
        if (newsPenaltyScore <= -8) {
            return "\"" + city + "\" AND \"" + country + "\" AND (travel OR safety OR crime OR protest OR accident)";
        }
        return "\"" + city + "\" AND \"" + country + "\" AND (travel OR tourism OR attraction OR restaurant OR festival)";
    }

    private String summarizeArticles(String city, String country, double newsPenaltyScore, List<ArticleItem> articles) {
        if (articles.isEmpty()) {
            return city + " 관련 뉴스를 찾지 못했습니다.";
        }

        String articleBlock = articles.stream()
                .map(article -> "- 제목: " + safe(article.title()) + "\n  설명: " + safe(article.description()))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");

        String mode = newsPenaltyScore <= -8
                ? "안전 이슈 중심으로 뉴스 흐름을 요약해 주세요."
                : "관광과 여행 분위기 중심으로 뉴스 흐름을 요약해 주세요.";

        try {
            String content = chatClientBuilder.build()
                    .prompt()
                    .system("당신은 여행 추천 서비스를 위한 뉴스 요약 보조자입니다. 사용자에게 보여줄 짧고 명확한 요약문을 작성하세요.")
                    .user("""
                            도시: %s
                            국가: %s
                            요청: %s

                            아래 기사들을 참고해서 2문장 이내로 한국어 요약을 작성하세요.
                            과장 없이 실제 여행 판단에 도움이 되도록 작성하세요.

                            %s
                            """.formatted(city, country, mode, articleBlock))
                    .call()
                    .content();

            return StringUtils.hasText(content) ? content.trim() : city + " 관련 뉴스 요약을 생성하지 못했습니다.";
        } catch (Exception e) {
            log.warn("News summary generation failed for city={}, country={}: {}", city, country, e.getMessage(), e);
            return city + " 관련 뉴스 " + articles.size() + "건을 찾았지만 요약 생성에는 실패했습니다.";
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    public record NewsApiResponse(String status, Integer totalResults, List<ArticleItem> articles) {}

    public record ArticleItem(
            String title,
            String url,
            String urlToImage,
            String description,
            String content,
            String publishedAt
    ) {}
}
