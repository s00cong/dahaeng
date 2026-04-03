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
import java.util.ArrayList;
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
        long totalStart = System.nanoTime();
        if (externalApiProperties.newsapi() == null || !StringUtils.hasText(externalApiProperties.newsapi().key())) {
            return new RecommendCitiesResponse.NewsInsight(
                    city + " 관련 뉴스 API 설정이 없어 뉴스를 조회하지 못했습니다.",
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
                .queryParam("from", LocalDate.now().minusDays(14))
                .build()
                .toUriString();

        NewsApiResponse response;
        try {
            long newsApiStart = System.nanoTime();
            response = restClient.get()
                    .uri(uri)
                    .header("X-Api-Key", externalApiProperties.newsapi().key())
                    .retrieve()
                    .body(NewsApiResponse.class);
            log.info("newsSearch api city={} country={} newsApiMs={}", city, country, elapsedMs(newsApiStart));
        } catch (Exception e) {
            log.warn("News API request failed for city={}, country={}: {}", city, country, e.getMessage(), e);
            return new RecommendCitiesResponse.NewsInsight(
                    city + " 관련 뉴스를 조회하지 못했습니다.",
                    List.of()
            );
        }

        log.info(
                "newsSearch response city={} country={} status={} totalResults={} code={} message={}",
                city,
                country,
                response != null ? safe(response.status()) : null,
                response != null ? response.totalResults() : null,
                response != null ? safe(response.code()) : null,
                response != null ? safe(response.message()) : null
        );

        List<ArticleItem> rawArticles = response == null || response.articles() == null
                ? List.of()
                : response.articles().stream().limit(5).toList();

        log.info(
                "newsSearch articles city={} country={} fetchedCount={}",
                city,
                country,
                rawArticles.size()
        );

        List<String> translatedTopTitles = translateTopTitles(rawArticles);
        List<RecommendCitiesResponse.Article> articles = new ArrayList<>();
        for (int i = 0; i < rawArticles.size(); i++) {
            ArticleItem article = rawArticles.get(i);
            String title = i < translatedTopTitles.size() ? translatedTopTitles.get(i) : safe(article.title());
            articles.add(new RecommendCitiesResponse.Article(
                    title,
                    safe(article.url()),
                    article.urlToImage(),
                    safe(article.description()),
                    safe(article.content()),
                    safe(article.publishedAt())
            ));
        }

        long summaryStart = System.nanoTime();
        String summary = summarizeArticles(city, country, newsPenaltyScore, rawArticles);
        long summaryMs = elapsedMs(summaryStart);
        log.info(
                "newsSearch city={} country={} articles={} summaryMs={} totalMs={}",
                city,
                country,
                rawArticles.size(),
                summaryMs,
                elapsedMs(totalStart)
        );
        return new RecommendCitiesResponse.NewsInsight(summary, articles);
    }

    private String buildQuery(String city, String country, double newsPenaltyScore) {
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

        String mode = "여행자 관점에서 최근 이슈와 분위기를 중심으로 요약해 주세요.";

        try {
            String content = chatClientBuilder.build()
                    .prompt()
                    .system("당신은 여행 뉴스 요약가입니다. 뉴스 기사 목록을 바탕으로 한국어 2문장 이내로 간결하게 요약해 주세요.")
                    .user("""
                            도시: %s
                            국가: %s
                            요약 방향: %s

                            아래 기사 목록을 바탕으로 핵심만 짧게 요약해 주세요.
                            과장 없이, 여행자가 이해하기 쉽게 써 주세요.

                            %s
                            """.formatted(city, country, mode, articleBlock))
                    .call()
                    .content();

            return StringUtils.hasText(content) ? content.trim() : city + " 관련 뉴스 요약을 생성하지 못했습니다.";
        } catch (Exception e) {
            log.warn("News summary generation failed for city={}, country={}: {}", city, country, e.getMessage(), e);
            return city + " 관련 뉴스 " + articles.size() + "건을 찾았지만 요약 생성에 실패했습니다.";
        }
    }

    private List<String> translateTopTitles(List<ArticleItem> articles) {
        List<String> originalTitles = articles.stream()
                .limit(3)
                .map(article -> safe(article.title()))
                .toList();

        if (originalTitles.isEmpty()) {
            return List.of();
        }

        try {
            String content = chatClientBuilder.build()
                    .prompt()
                    .system("Translate the given English news titles into natural Korean. Return exactly the same number of lines in the same order, without numbering or extra explanation.")
                    .user(String.join("\n", originalTitles))
                    .call()
                    .content();

            if (!StringUtils.hasText(content)) {
                return originalTitles;
            }

            List<String> translatedTitles = content.lines()
                    .map(String::trim)
                    .filter(StringUtils::hasText)
                    .toList();

            return translatedTitles.size() == originalTitles.size() ? translatedTitles : originalTitles;
        } catch (Exception e) {
            log.warn("News title translation failed: {}", e.getMessage());
            return originalTitles;
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private long elapsedMs(long startNano) {
        return (System.nanoTime() - startNano) / 1_000_000;
    }

    public record NewsApiResponse(
            String status,
            Integer totalResults,
            String code,
            String message,
            List<ArticleItem> articles
    ) {}

    public record ArticleItem(
            String title,
            String url,
            String urlToImage,
            String description,
            String content,
            String publishedAt
    ) {}
}
