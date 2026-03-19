package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.city.entity.CityTag;
import com.example.dahaeng.domain.city.entity.CityClimateTag;
import com.example.dahaeng.domain.city.repository.CityClimateTagRepository;
import com.example.dahaeng.domain.city.repository.CityTagRepository;
import com.example.dahaeng.domain.interest.constant.TravelTagCatalog;
import com.example.dahaeng.domain.interest.enums.TravelTagCategory;
import com.example.dahaeng.domain.country.enums.CountryEnum;
import com.example.dahaeng.domain.country.service.DangerService;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.livingcost.util.DailyLivingCostCalculator;
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
    private final CityClimateTagRepository cityClimateTagRepository;
    private final DangerService dangerService;
    private final ExchangeRepository exchangeRepository;

    public RecommendCitySummaryResponse recommend(RecommendCitiesRequest request) {
        String yearMonth = YearMonth.of(YearMonth.now().getYear(), request.month()).toString();
        List<String> selectedTags = RecommendTagNormalizer.normalize(request.selectedTags());
        Exchange usdExchange = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD).orElse(null);
        Double usdToKrwRate = usdExchange != null ? usdExchange.getKrwPer1cur() : null;
        List<String> climateTags = extractClimateTags(selectedTags);
        List<String> regularTags = selectedTags.stream()
                .filter(tag -> !climateTags.contains(tag))
                .toList();

        Map<Long, List<CityTag>> tagMap = regularTags.isEmpty()
                ? Map.of()
                : cityTagRepository.findAllByTagNames(regularTags).stream()
                .collect(Collectors.groupingBy(cityTag -> cityTag.getCity().getId()));
        Map<Long, List<CityClimateTag>> climateTagMap = climateTags.isEmpty()
                ? Map.of()
                : cityClimateTagRepository.findAllByMonthAndTagNames(Long.valueOf(request.month()), climateTags).stream()
                .collect(Collectors.groupingBy(cityClimateTag -> cityClimateTag.getCity().getId()));

        var recommendations = recommendQueryRepository.findCityCandidates(yearMonth).stream()
                .map(city -> score(
                        city,
                        tagMap.get(city.getCityId()),
                        climateTagMap.get(city.getCityId()),
                        request,
                        usdToKrwRate
                ))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(CityRankResult::totalScore).reversed())
                .limit(3)
                .map(city -> new RecommendCitySummaryResponse.RecommendationItem(
                        city.cityId(),
                        city.cityName(),
                        city.cityImageUrl(),
                        round(nz(city.dailyLocalCost())),
                        new RecommendCitySummaryResponse.Scores(
                                round(nz(city.totalScore())),
                                round(nz(city.tagScore())),
                                round(nz(city.budgetScore())),
                                round(nz(city.safetyScore())),
                                round(nz(city.newsPenaltyScore()))
                        ),
                        dangerService.dangers(city.countryId()),
                        city.lat(),
                        city.lon()
                ))
                .toList();

        return RecommendCitySummaryResponse.of(request, recommendations);
    }

    private CityRankResult score(
            CityCandidateProjection city,
            List<CityTag> cityTags,
            List<CityClimateTag> climateTags,
            RecommendCitiesRequest request,
            Double usdToKrwRate
    ) {
        if (isDomestic(city) || isExcludedByDanger(city)) {
            return null;
        }

        double flight = nz(city.getAvgFlightPrice());
        DailyLivingCostCalculator.DailyLivingCost dailyLivingCost = DailyLivingCostCalculator.calculate(
                city.getLunchMenu(),
                city.getDinnerInAResturantFor2(),
                city.getCappuccino(),
                city.getCokePepsi(),
                city.getLocalTransportTicket(),
                usdToKrwRate,
                nz(city.getAvgHotelPrice())
        );
        double expectedTotalCost = flight + (dailyLivingCost.total() * request.travelDays());
        double totalBudget = request.userDailyBudget() * request.travelDays();

        if (expectedTotalCost > totalBudget * 1.3) {
            return null;
        }

        double tagRaw = averageTagScore(cityTags, climateTags);
        RecommendationScoreCalculator.ScoreBreakdown scoreBreakdown = RecommendationScoreCalculator.calculate(
                tagRaw,
                request,
                flight,
                dailyLivingCost.total(),
                city.getDangerAttention(),
                city.getDangerAttentionPartial(),
                city.getNewsPenaltyScore()
        );

        return new CityRankResult(
                city.getCityId(),
                city.getCountryId(),
                city.getCountryName(),
                city.getCityName(),
                city.getCityImageUrl(),
                scoreBreakdown.finalScore(),
                scoreBreakdown.budgetScore(),
                scoreBreakdown.safetyScore(),
                scoreBreakdown.tagScore(),
                scoreBreakdown.newsPenaltyScore(),
                city.getCurrency(),
                dailyLivingCost.hotel(),
                dailyLivingCost.total(),
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

    private boolean isDomestic(CityCandidateProjection city) {
        return CountryEnum.SOUTH_KOREA.getCountryName().equalsIgnoreCase(city.getCountryName());
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

    private double averageTagScore(List<CityTag> cityTags, List<CityClimateTag> climateTags) {
        boolean hasRegularTags = cityTags != null && !cityTags.isEmpty();
        boolean hasClimateTags = climateTags != null && !climateTags.isEmpty();

        if (!hasRegularTags && !hasClimateTags) {
            return 0.0;
        }
        if (!hasClimateTags) {
            return averageTagScore(cityTags);
        }
        if (!hasRegularTags) {
            return climateTags.stream()
                    .map(CityClimateTag::getScore)
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);
        }

        double regularAverage = averageTagScore(cityTags);
        double climateAverage = climateTags.stream()
                .map(CityClimateTag::getScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        return (regularAverage + climateAverage) / 2.0;
    }

    private List<String> extractClimateTags(List<String> selectedTags) {
        List<String> climateCatalog = TravelTagCatalog.ALLOWED_TAGS.getOrDefault(TravelTagCategory.CLIMATE, List.of());
        return selectedTags.stream()
                .filter(climateCatalog::contains)
                .toList();
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
