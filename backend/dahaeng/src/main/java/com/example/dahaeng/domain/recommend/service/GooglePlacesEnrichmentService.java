package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import com.example.dahaeng.domain.recommend.repository.SpotRecommendationProjection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class GooglePlacesEnrichmentService implements PlaceEnrichmentService {

    @Override
    public RecommendCitiesResponse.RecommendedPlace enrich(
            SpotRecommendationProjection spot,
            List<String> selectedTags,
            Map<String, Double> tagScores
    ) {
        log.debug("Using DB-backed place enrichment for spot={}", spot.getPlaceName());

        return new RecommendCitiesResponse.RecommendedPlace(
                spot.getPlaceName(),
                spot.getPlaceNameKo(),
                selectedTags,
                tagScores,
                spot.getAddress(),
                spot.getWebsiteUrl(),
                spot.getSocialUrl(),
                new RecommendCitiesResponse.Location(spot.getLat(), spot.getLon())
        );
    }
}
