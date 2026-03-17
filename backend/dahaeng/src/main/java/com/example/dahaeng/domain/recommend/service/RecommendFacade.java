package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.city.entity.CityTag;
import com.example.dahaeng.domain.city.repository.CityTagRepository;
import com.example.dahaeng.domain.country.service.DangerService;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;
import com.example.dahaeng.domain.recommend.dto.response.RecommendCitySummaryResponse;
import com.example.dahaeng.domain.recommend.repository.CityCandidateProjection;
import com.example.dahaeng.domain.recommend.repository.RecommendQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendFacade {

    private final RecommendQueryRepository recommendQueryRepository;
    private final CityTagRepository cityTagRepository;
    private final DangerService dangerService;

    public RecommendCitySummaryResponse recommend(RecommendCitiesRequest request) {
        String yearMonth = YearMonth.of(YearMonth.now().getYear(), request.month()).toString();
        double totalBudget = request.userDailyBudget() * request.travelDays();
        List<String> selectedTags = RecommendTagNormalizer.normalize(request.selectedTags());

        Map<Long, List<CityTag>> tagMap = selectedTags.isEmpty()
                ? Map.of()
                : cityTagRepository.findAllByTagNames(selectedTags).stream()
                .collect(Collectors.groupingBy(cityTag -> cityTag.getCity().getId()));

        var recommendations = recommendQueryRepository.findCityCandidates(yearMonth).stream()
                .map(city -> score(city, tagMap.get(city.getCityId()), request.travelDays(), totalBudget))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(CityRankResult::totalScore).reversed())
                .limit(3)
                .map(city -> new RecommendCitySummaryResponse.RecommendationItem(
                        city.cityId(),
                        city.cityName(),
                        city.cityImageUrl(),
                        round(nz(city.flightPrice()) + nz(city.hotelPerDay()) + nz(city.dailyLocalCost())),
                        dangerService.dangers(city.countryId()),
                        city.lat(),
                        city.lon()
                ))
                .toList();

        return RecommendCitySummaryResponse.of(request, recommendations);
    }

    private CityRankResult score(CityCandidateProjection city, List<CityTag> cityTags, int travelDays, double totalBudget) {
        if (isExcludedByDanger(city)) {
            return null;
        }

        double flight = nz(city.getAvgFlightPrice());
        double hotelPerDay = nz(city.getAvgHotelPrice());
        double food = nz(city.getFoodCost());
        double transport = nz(city.getTransportCost());
        double dailyLocal = food + transport;
        double expectedTotalCost = flight + ((hotelPerDay + dailyLocal) * travelDays);

        if (expectedTotalCost > totalBudget * 1.3) {
            return null;
        }

        double tagRaw = averageTagScore(cityTags);

        double tagScore = Math.min(55.0, tagRaw * 55.0);
        double ratio = (totalBudget - expectedTotalCost) / totalBudget;
        double budgetScore = ratio >= 0
                ? Math.min(25.0, ratio * 25.0)
                : Math.max(-25.0, (ratio / 0.3) * 25.0);
        double safetyScore = hasText(city.getDangerAttention()) ? 7.5 : 15.0;
        double newsPenalty = -Math.min(15.0, Math.max(0.0, nz(city.getNewsPenaltyScore())));
        double totalScore = clamp(tagScore + budgetScore + safetyScore + newsPenalty, 0.0, 100.0);

        return new CityRankResult(
                city.getCityId(),
                city.getCountryId(),
                city.getCountryName(),
                city.getCityName(),
                city.getCityImageUrl(),
                totalScore,
                budgetScore,
                safetyScore,
                tagScore,
                newsPenalty,
                city.getCurrency(),
                hotelPerDay,
                dailyLocal,
                city.getOriginAirport(),
                (int) flight,
                city.getDescription(),
                city.getLat(),
                city.getLon()
        );
    }

    private boolean isExcludedByDanger(CityCandidateProjection city) {
        return hasText(city.getDangerControl()) || hasText(city.getDangerLimita());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private double nz(Number value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private double averageTagScore(List<CityTag> cityTags) {
        if (cityTags == null || cityTags.isEmpty()) {
            return 0.0;
        }

        return cityTags.stream()
                .map(CityTag::getTagScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
