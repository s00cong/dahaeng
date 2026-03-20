package com.example.dahaeng.domain.city.service;

import com.example.dahaeng.domain.city.dto.response.AllCitiesResponse;
import com.example.dahaeng.domain.city.dto.response.CityResponse;
import com.example.dahaeng.domain.city.dto.response.NotRecommendCityDetailResponse;
import com.example.dahaeng.domain.city.dto.response.RecommendCityDetailResponse;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.entity.CityClimateTag;
import com.example.dahaeng.domain.city.entity.CityTag;
import com.example.dahaeng.domain.city.enums.CityEnum;
import com.example.dahaeng.domain.city.repository.CityClimateTagRepository;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.city.repository.CityTagRepository;
import com.example.dahaeng.domain.country.entity.Danger;
import com.example.dahaeng.domain.country.repository.DangerRepository;
import com.example.dahaeng.domain.country.service.DangerService;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.flight.entity.FlightSummary;
import com.example.dahaeng.domain.flight.repository.FlightSummaryRepository;
import com.example.dahaeng.domain.interest.constant.TravelTagCatalog;
import com.example.dahaeng.domain.interest.enums.TravelTagCategory;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCityRepository;
import com.example.dahaeng.domain.livingcost.util.DailyLivingCostCalculator;
import com.example.dahaeng.domain.place.entity.TouristSpot;
import com.example.dahaeng.domain.place.repository.SpotTagRepository;
import com.example.dahaeng.domain.place.repository.TouristSpotRepository;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;
import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import com.example.dahaeng.domain.recommend.repository.SpotRecommendationProjection;
import com.example.dahaeng.domain.recommend.repository.SpotTagScoreProjection;
import com.example.dahaeng.domain.recommend.repository.TouristSpotRecommendRepository;
import com.example.dahaeng.domain.recommend.service.CityRankResult;
import com.example.dahaeng.domain.recommend.service.NewsSearchService;
import com.example.dahaeng.domain.recommend.service.PlaceEnrichmentService;
import com.example.dahaeng.domain.recommend.service.RecommendTagNormalizer;
import com.example.dahaeng.domain.recommend.service.RecommendationNarrationService;
import com.example.dahaeng.domain.recommend.service.RecommendationScoreCalculator;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CityService {
    private final CityRepository cityRepository;
    private final FlightSummaryRepository flightSummaryRepository;
    private final LivingCostOfCityRepository livingCostOfCityRepository;
    private final CityClimateTagRepository cityClimateTagRepository;
    private final DangerRepository dangerRepository;
    private final CityTagRepository cityTagRepository;
    private final DangerService dangerService;
    private final ExchangeRepository exchangeRepository;
    private final TouristSpotRepository touristSpotRepository;
    private final TouristSpotRecommendRepository touristSpotRecommendRepository;
    private final SpotTagRepository spotTagRepository;
    private final NewsSearchService newsSearchService;
    private final RecommendationNarrationService narrationService;
    private final PlaceEnrichmentService placeEnrichmentService;

    public List<AllCitiesResponse> getAllCities() {
        String targetYearMonth = currentYearMonth();
        Exchange usdExchange = getLatestUsdExchange();
        List<City> cities = cityRepository.findAll();
        List<AllCitiesResponse> result = new ArrayList<>();

        for (City city : cities) {
            double hotelPerDay = 0.0;
            FlightSummary summary = flightSummaryRepository.findByCityIdAndYearMonthWithCity(city.getId(), targetYearMonth)
                    .orElse(null);

            if (summary != null) {
                hotelPerDay = summary.getAvgHotelPrice() != null ? summary.getAvgHotelPrice() : 0.0;
            }

            LivingCostOfCity cost = livingCostOfCityRepository.findOneByCityId(city.getId()).orElse(null);
            if (cost != null && cost.getCity().getCityName().toLowerCase().equals(CityEnum.SEOUL.getCityName())) {
                continue;
            }

            DailyLivingCostCalculator.DailyLivingCost dailyLivingCost = DailyLivingCostCalculator.calculate(
                    cost,
                    usdExchange != null ? usdExchange.getKrwPer1cur() : null,
                    hotelPerDay
            );

            result.add(new AllCitiesResponse(
                    city.getId(),
                    city.getCityName(),
                    city.getImgUrl(),
                    dailyLivingCost.total(),
                    dangerService.dangers(city.getCountry().getId()),
                    city.getLat(),
                    city.getLon()
            ));
        }

        return result;
    }

    public RecommendCityDetailResponse getRecommendCityDetail(Long id, RecommendCitiesRequest request) {
        validateRecommendDetailRequest(request);

        City city = cityRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "도시 정보를 찾을 수 없습니다."));
        String targetYearMonth = resolveYearMonth(request);
        Exchange usdExchange = getLatestUsdExchange();

        FlightSummary summary = flightSummaryRepository.findByCityIdAndYearMonthWithCity(id, targetYearMonth).orElse(null);
        double avgFlightPrice = summary != null && summary.getAvgFlightPrice() != null ? summary.getAvgFlightPrice() : 0.0;
        double avgHotelPrice = summary != null && summary.getAvgHotelPrice() != null ? summary.getAvgHotelPrice() : 0.0;
        Exchange exchange = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(city.getCountry().getCurrency()).orElse(null);

        LivingCostOfCity cost = livingCostOfCityRepository.findOneByCityId(id).orElse(null);
        DailyLivingCostCalculator.DailyLivingCost dailyLivingCost = DailyLivingCostCalculator.calculate(
                cost,
                usdExchange != null ? usdExchange.getKrwPer1cur() : null,
                avgHotelPrice
        );

        List<CityTag> cityTags = cityTagRepository.findCityTagsByCityId(id);
        List<String> selectedTags = normalizeSelectedTags(request, cityTags);
        List<String> climateTags = extractClimateTags(selectedTags);

        double tagRaw = calculateTagRaw(id, selectedTags, climateTags, request.month());
        Danger danger = dangerRepository.findByCountryId(city.getCountry().getId()).orElse(null);
        RecommendationScoreCalculator.ScoreBreakdown scoreBreakdown = RecommendationScoreCalculator.calculate(
                tagRaw,
                request,
                avgFlightPrice,
                dailyLivingCost.total(),
                danger != null ? danger.getAttention() : null,
                danger != null ? danger.getAttentionPartial() : null,
                city.getNews_penalty_score()
        );

        List<RecommendCitiesResponse.RecommendedPlace> places = buildRecommendedPlaces(id, selectedTags);
        RecommendCitiesResponse.NewsInsight newsInsight = newsSearchService.searchAndSummarize(
                city.getCityName(),
                city.getCountry().getCountryName(),
                scoreBreakdown.newsPenaltyScore()
        );

        String recommendationReason = narrationService.generateReason(
                new CityRankResult(
                        city.getId(),
                        city.getCountry().getId(),
                        city.getCountry().getCountryName(),
                        city.getCityName(),
                        city.getImgUrl(),
                        round(scoreBreakdown.finalScore()),
                        round(scoreBreakdown.budgetScore()),
                        round(scoreBreakdown.safetyScore()),
                        round(scoreBreakdown.tagScore()),
                        round(scoreBreakdown.newsPenaltyScore()),
                        city.getCountry().getCurrency().name(),
                        dailyLivingCost.hotel(),
                        dailyLivingCost.total(),
                        summary != null ? summary.getOriginAirport() : null,
                        (int) avgFlightPrice,
                        city.getDescription(),
                        city.getLat(),
                        city.getLon()
                ),
                places,
                selectedTags,
                newsInsight.summary()
        );

        List<RecommendCityDetailResponse.TagResponse> tags = cityTags.stream()
                .map(cityTag -> new RecommendCityDetailResponse.TagResponse(
                        cityTag.getTag().getName(),
                        cityTag.getTagScore()
                ))
                .toList();

        List<RecommendCityDetailResponse.TouristSpotResponse> touristSpots = places.stream()
                .map(place -> new RecommendCityDetailResponse.TouristSpotResponse(
                        place.placeName(),
                        place.location() != null ? place.location().lat() : null,
                        place.location() != null ? place.location().lon() : null,
                        place.address(),
                        place.websiteUrl(),
                        place.socialUrl(),
                        place.tagScores().entrySet().stream()
                                .filter(entry -> entry.getValue() != null && entry.getValue() > 0)
                                .map(Map.Entry::getKey)
                                .toList(),
                        round4(place.tagScores().values().stream()
                                .filter(java.util.Objects::nonNull)
                                .mapToDouble(Double::doubleValue)
                                .sum()),
                        place.tagScores()
                ))
                .toList();

        List<RecommendCityDetailResponse.NewsItem> newsItems = newsInsight.articles().stream()
                .limit(3)
                .map(article -> new RecommendCityDetailResponse.NewsItem(
                        article.title(),
                        article.url(),
                        article.content(),
                        article.description(),
                        article.imageUrl(),
                        article.publishedAt()
                ))
                .toList();

        return new RecommendCityDetailResponse(
                city.getCityName(),
                new RecommendCityDetailResponse.Score(
                        round(scoreBreakdown.finalScore()),
                        round(scoreBreakdown.budgetScore()),
                        round(scoreBreakdown.safetyScore()),
                        round(scoreBreakdown.tagScore()),
                        round(scoreBreakdown.newsPenaltyScore())
                ),
                recommendationReason,
                new RecommendCityDetailResponse.LivingCostFor1Day(
                        new RecommendCityDetailResponse.Food(
                                dailyLivingCost.food().total(),
                                dailyLivingCost.food().breakfast(),
                                dailyLivingCost.food().lunch(),
                                dailyLivingCost.food().dinner(),
                                dailyLivingCost.food().cappuccino(),
                                dailyLivingCost.food().cokePepsi()
                        ),
                        new RecommendCityDetailResponse.Transportation(
                                dailyLivingCost.transportation().total(),
                                dailyLivingCost.transportation().localTransportTicket(),
                                dailyLivingCost.transportation().ticketCount()
                        ),
                        dailyLivingCost.hotel(),
                        dailyLivingCost.total()
                ),
                new RecommendCityDetailResponse.AirTicketAndHotel(avgFlightPrice, dailyLivingCost.hotel()),
                new RecommendCityDetailResponse.ExchangeRate(
                        city.getCountry().getCurrency().name(),
                        exchange != null ? exchange.getKrwPerDisplayUnit() : null,
                        exchange != null && exchange.getEventDate() != null ? exchange.getEventDate().toString() : null
                ),
                new RecommendCityDetailResponse.News(newsInsight.summary(), newsItems),
                dangerService.dangers(city.getCountry().getId()),
                tags,
                touristSpots
        );
    }

    public NotRecommendCityDetailResponse getNotRecommendCityDetail(Long id) {
        City city = cityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("도시 정보를 찾을 수 없습니다."));
        String targetYearMonth = currentYearMonth();
        Exchange usdExchange = getLatestUsdExchange();

        FlightSummary summary = flightSummaryRepository.findByCityIdAndYearMonthWithCity(id, targetYearMonth).orElse(null);
        double avgFlightPrice = summary != null && summary.getAvgFlightPrice() != null ? summary.getAvgFlightPrice() : 0.0;
        double avgHotelPrice = summary != null && summary.getAvgHotelPrice() != null ? summary.getAvgHotelPrice() : 0.0;
        Exchange exchange = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(city.getCountry().getCurrency()).orElse(null);

        LivingCostOfCity cost = livingCostOfCityRepository.findOneByCityId(id).orElse(null);
        DailyLivingCostCalculator.DailyLivingCost dailyLivingCost = DailyLivingCostCalculator.calculate(
                cost,
                usdExchange != null ? usdExchange.getKrwPer1cur() : null,
                avgHotelPrice
        );

        List<NotRecommendCityDetailResponse.TagResponse> tags = cityTagRepository.findCityTagsByCityId(id).stream()
                .map(cityTag -> new NotRecommendCityDetailResponse.TagResponse(
                        cityTag.getTag().getName(),
                        cityTag.getTagScore()
                ))
                .toList();

        return new NotRecommendCityDetailResponse(
                city.getId(),
                city.getCityName(),
                new NotRecommendCityDetailResponse.LivingCostFor1Day(
                        new NotRecommendCityDetailResponse.Food(
                                dailyLivingCost.food().total(),
                                dailyLivingCost.food().breakfast(),
                                dailyLivingCost.food().lunch(),
                                dailyLivingCost.food().dinner(),
                                dailyLivingCost.food().cappuccino(),
                                dailyLivingCost.food().cokePepsi()
                        ),
                        new NotRecommendCityDetailResponse.Transportation(
                                dailyLivingCost.transportation().total(),
                                dailyLivingCost.transportation().localTransportTicket(),
                                dailyLivingCost.transportation().ticketCount()
                        ),
                        dailyLivingCost.hotel(),
                        dailyLivingCost.total()
                ),
                new NotRecommendCityDetailResponse.AirTicketAndHotel(avgFlightPrice, dailyLivingCost.hotel()),
                new NotRecommendCityDetailResponse.ExchangeRate(
                        city.getCountry().getCurrency().name(),
                        exchange != null ? exchange.getKrwPerDisplayUnit() : null,
                        exchange != null && exchange.getEventDate() != null ? exchange.getEventDate().toString() : null
                ),
                dangerService.dangers(city.getCountry().getId()),
                tags
        );
    }

    public List<CityResponse> list(Long countryId) {
        if (countryId == null) {
            return parseToCityListResponseList(cityRepository.findAllByIsDeletedFalse());
        }
        return parseToCityListResponseList(cityRepository.findAllByCountryIdAndIsDeletedFalse(countryId));
    }

    private List<CityResponse> parseToCityListResponseList(List<City> cities) {
        return cities.stream()
                .map(CityResponse::from)
                .toList();
    }

    private List<RecommendCitiesResponse.RecommendedPlace> buildRecommendedPlaces(Long cityId, List<String> selectedTags) {
        List<SpotRecommendationProjection> candidates;
        if (selectedTags.isEmpty()) {
            candidates = touristSpotRepository.findByCityId(cityId).stream()
                    .map(this::toSpotProjection)
                    .sorted(Comparator.comparing(SpotRecommendationProjection::getSpotId))
                    .limit(5)
                    .toList();
        } else {
            candidates = touristSpotRecommendRepository.findSpotCandidates(List.of(cityId), selectedTags).stream()
                    .limit(5)
                    .toList();
        }

        List<Long> spotIds = candidates.stream()
                .map(SpotRecommendationProjection::getSpotId)
                .toList();

        Map<Long, Map<String, Double>> tagScoreMap = new HashMap<>();
        if (!spotIds.isEmpty() && !selectedTags.isEmpty()) {
            for (SpotTagScoreProjection row : spotTagRepository.findTagScoresBySpotIds(spotIds, selectedTags)) {
                tagScoreMap
                        .computeIfAbsent(row.getSpotId(), key -> new LinkedHashMap<>())
                        .put(row.getTagName(), row.getScore());
            }
        }

        List<RecommendCitiesResponse.RecommendedPlace> places = new ArrayList<>();
        for (SpotRecommendationProjection spot : candidates) {
            Map<String, Double> scores = new LinkedHashMap<>();
            for (String selectedTag : selectedTags) {
                scores.put(selectedTag, 0.0);
            }
            scores.putAll(tagScoreMap.getOrDefault(spot.getSpotId(), Map.of()));
            places.add(placeEnrichmentService.enrich(spot, selectedTags, scores));
        }
        return places;
    }

    private SpotRecommendationProjection toSpotProjection(TouristSpot touristSpot) {
        return new SpotRecommendationProjection() {
            @Override
            public Long getSpotId() {
                return touristSpot.getId();
            }

            @Override
            public Long getCityId() {
                return touristSpot.getCity().getId();
            }

            @Override
            public String getPlaceName() {
                return touristSpot.getTouristName();
            }

            @Override
            public String getDescription() {
                return touristSpot.getDescription();
            }

            @Override
            public String getImageUrl() {
                return touristSpot.getImageUrl();
            }

            @Override
            public String getAddress() {
                return touristSpot.getAddress();
            }

            @Override
            public String getWebsiteUrl() {
                return touristSpot.getWebsite();
            }

            @Override
            public String getSocialUrl() {
                return touristSpot.getSns();
            }

            @Override
            public Double getLat() {
                return touristSpot.getLat();
            }

            @Override
            public Double getLon() {
                return touristSpot.getLon();
            }

            @Override
            public Double getMatchScore() {
                return 0.0;
            }
        };
    }

    private String currentYearMonth() {
        YearMonth now = YearMonth.now();
        return YearMonth.of(now.getYear(), now.getMonth()).toString();
    }

    private String resolveYearMonth(RecommendCitiesRequest request) {
        if (request != null && request.month() != null) {
            return YearMonth.of(YearMonth.now().getYear(), request.month()).toString();
        }
        return currentYearMonth();
    }

    private List<String> normalizeSelectedTags(RecommendCitiesRequest request, List<CityTag> cityTags) {
        if (request != null && request.selectedTags() != null) {
            return RecommendTagNormalizer.normalize(request.selectedTags());
        }
        if (request != null) {
            return List.of();
        }
        return cityTags.stream()
                .map(cityTag -> cityTag.getTag().getName())
                .toList();
    }

    private double calculateTagRaw(Long cityId, List<String> selectedTags, List<String> climateTags, Integer month) {
        if (selectedTags.isEmpty()) {
            return 0.0;
        }

        List<String> regularTags = selectedTags.stream()
                .filter(tag -> !climateTags.contains(tag))
                .toList();

        List<CityTag> matchedTags = regularTags.isEmpty()
                ? List.of()
                : cityTagRepository.findCityTagsByCityIdAndTagNames(cityId, regularTags);
        List<CityClimateTag> matchedClimateTags = (climateTags.isEmpty() || month == null)
                ? List.of()
                : cityClimateTagRepository.findByCityIdAndMonthAndTagNames(cityId, Long.valueOf(month), climateTags);

        boolean hasRegularTags = !matchedTags.isEmpty();
        boolean hasClimateTags = !matchedClimateTags.isEmpty();
        if (!hasRegularTags && !hasClimateTags) {
            return 0.0;
        }

        double regularAverage = matchedTags.stream()
                .map(CityTag::getTagScore)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        double climateAverage = matchedClimateTags.stream()
                .map(CityClimateTag::getScore)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        if (!hasClimateTags) {
            return regularAverage;
        }
        if (!hasRegularTags) {
            return climateAverage;
        }
        return (regularAverage + climateAverage) / 2.0;
    }

    private List<String> extractClimateTags(List<String> selectedTags) {
        List<String> climateCatalog = TravelTagCatalog.ALLOWED_TAGS.getOrDefault(TravelTagCategory.CLIMATE, List.of());
        return selectedTags.stream()
                .filter(climateCatalog::contains)
                .toList();
    }

    private void validateRecommendDetailRequest(RecommendCitiesRequest request) {
        if (request == null
                || request.userDailyBudget() == null
                || request.travelDays() == null
                || request.travelDays() <= 0
                || request.month() == null) {
            throw new CustomException(
                    ErrorCode.INVALID_REQUEST,
                    "recommend=true 상세 조회에는 userDailyBudget, travelDays, month가 필요합니다."
            );
        }
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private Exchange getLatestUsdExchange() {
        return exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD).orElse(null);
    }
}
