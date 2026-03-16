package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import com.example.dahaeng.domain.recommend.repository.SpotRecommendationProjection;
import com.example.dahaeng.global.config.ExternalApiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class GooglePlacesEnrichmentService implements PlaceEnrichmentService {

    private final ExternalApiProperties externalApiProperties;
    private final RestClient.Builder restClientBuilder;

    @Override
    public RecommendCitiesResponse.RecommendedPlace enrich(
            SpotRecommendationProjection spot,
            List<String> selectedTags,
            Map<String, Double> tagScores
    ) {
        String description = spot.getDescription();
        String imageUrl = null;
        Double lat = spot.getLat();
        Double lon = spot.getLon();

        if (externalApiProperties.googlePlaces() != null
                && StringUtils.hasText(externalApiProperties.googlePlaces().key())) {
            try {
                String maskedKey = maskKey(externalApiProperties.googlePlaces().key());
                log.info("Google Places request configured with key={} baseUrl={}",
                        maskedKey, externalApiProperties.googlePlaces().baseUrl());
                RestClient restClient = restClientBuilder.baseUrl(externalApiProperties.googlePlaces().baseUrl()).build();
                TextSearchResponse searchResponse = restClient.post()
                        .uri("/v1/places:searchText")
                        .header("X-Goog-Api-Key", externalApiProperties.googlePlaces().key())
                        .header("X-Goog-FieldMask", "places.id,places.displayName,places.location,places.photos,places.editorialSummary")
                        .body(new TextSearchRequest(spot.getPlaceName(), "ko"))
                        .retrieve()
                        .body(TextSearchResponse.class);

                if (searchResponse != null && searchResponse.places() != null && !searchResponse.places().isEmpty()) {
                    PlaceItem place = searchResponse.places().get(0);

                    if (place.location() != null) {
                        lat = place.location().latitude();
                        lon = place.location().longitude();
                    }

                    if (place.editorialSummary() != null && StringUtils.hasText(place.editorialSummary().text())) {
                        description = place.editorialSummary().text();
                    }

                    if (place.photos() != null && !place.photos().isEmpty()) {
                        String photoName = place.photos().get(0).name();
                        PhotoMediaResponse photoResponse = restClient.get()
                                .uri(uriBuilder -> uriBuilder
                                        .path("/v1/{photoName}/media")
                                        .queryParam("maxWidthPx", 800)
                                        .queryParam("skipHttpRedirect", true)
                                        .build(photoName))
                                .header("X-Goog-Api-Key", externalApiProperties.googlePlaces().key())
                                .retrieve()
                                .body(PhotoMediaResponse.class);

                        if (photoResponse != null && StringUtils.hasText(photoResponse.photoUri())) {
                            imageUrl = photoResponse.photoUri();
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Google Places enrichment failed for spot={} key={} baseUrl={}: {}",
                        spot.getPlaceName(),
                        maskKey(externalApiProperties.googlePlaces().key()),
                        externalApiProperties.googlePlaces().baseUrl(),
                        e.getMessage(),
                        e);
            }
        }

        return new RecommendCitiesResponse.RecommendedPlace(
                spot.getPlaceName(),
                selectedTags,
                tagScores,
                description,
                imageUrl,
                new RecommendCitiesResponse.Location(lat, lon)
        );
    }

    public record TextSearchRequest(String textQuery, String languageCode) {}

    public record TextSearchResponse(List<PlaceItem> places) {}

    public record PlaceItem(
            String id,
            DisplayName displayName,
            PlaceLocation location,
            EditorialSummary editorialSummary,
            List<Photo> photos
    ) {}

    public record DisplayName(String text, String languageCode) {}

    public record PlaceLocation(Double latitude, Double longitude) {}

    public record EditorialSummary(String text, String languageCode) {}

    public record Photo(String name) {}

    public record PhotoMediaResponse(String name, String photoUri) {}

    private String maskKey(String key) {
        if (!StringUtils.hasText(key)) {
            return "<empty>";
        }
        if (key.length() <= 8) {
            return key.substring(0, Math.min(4, key.length())) + "...";
        }
        return key.substring(0, 6) + "..." + key.substring(key.length() - 4);
    }
}
