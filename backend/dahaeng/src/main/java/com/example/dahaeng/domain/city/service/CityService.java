package com.example.dahaeng.domain.city.service;

import com.example.dahaeng.domain.city.dto.response.AllCitiesResponse;
import com.example.dahaeng.domain.city.dto.response.CityResponse;
import com.example.dahaeng.domain.city.dto.response.NotRecommendCityDetailResponse;
import com.example.dahaeng.domain.city.dto.response.RecommendCityDetailResponse;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.entity.CityTag;
import com.example.dahaeng.domain.city.enums.CityEnum;
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
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCityRepository;
import com.example.dahaeng.domain.place.entity.TouristSpot;
import com.example.dahaeng.domain.place.repository.SpotTagRepository;
import com.example.dahaeng.domain.place.repository.TouristSpotRepository;
import com.example.dahaeng.domain.recommend.service.CityRankResult;
import com.example.dahaeng.domain.recommend.service.NewsSearchService;
import com.example.dahaeng.domain.recommend.service.PlaceEnrichmentService;
import com.example.dahaeng.domain.recommend.service.RecommendTagNormalizer;
import com.example.dahaeng.domain.recommend.service.RecommendationNarrationService;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;
import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import com.example.dahaeng.domain.recommend.repository.SpotRecommendationProjection;
import com.example.dahaeng.domain.recommend.repository.SpotTagScoreProjection;
import com.example.dahaeng.domain.recommend.repository.TouristSpotRecommendRepository;
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
            double flightAndHotel = 0.0;
            FlightSummary summary = flightSummaryRepository.findByCityIdAndYearMonthWithCity(city.getId(), targetYearMonth)
                    .orElse(null);

            if (summary != null) {
                double avgFlightPrice = summary.getAvgFlightPrice() != null ? summary.getAvgFlightPrice() : 0.0;
                double avgHotelPrice = summary.getAvgHotelPrice() != null ? summary.getAvgHotelPrice() : 0.0;
                flightAndHotel = avgFlightPrice + avgHotelPrice;
            }

            double localLivingCost = 0.0;
            LivingCostOfCity cost = livingCostOfCityRepository.findOneByCityId(city.getId()).orElse(null);
            if (cost != null) {
                double transport = cost.getTransport() != null ? cost.getTransport() : 0.0;
                double food = cost.getFood() != null ? cost.getFood() : 0.0;
                localLivingCost = transport + food;
            }

            if (cost != null && cost.getCity().getCityName().toLowerCase().equals(CityEnum.SEOUL.getCityName())) {
                continue;
            }

            result.add(new AllCitiesResponse(
                    city.getId(),
                    city.getCityName(),
                    city.getImgUrl(),
                    flightAndHotel + localLivingCost,
                    dangerService.dangers(city.getCountry().getId()),
                    city.getLat(),
                    city.getLon()
            ));
        }

        return result;
    }

    public RecommendCityDetailResponse getRecommendCityDetail(Long id, RecommendCitiesRequest request) {
        City city = cityRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "도시 정보를 찾을 수 없습니다."));
        String targetYearMonth = resolveYearMonth(request);
        Exchange usdExchange = getLatestUsdExchange();

        FlightSummary summary = flightSummaryRepository.findByCityIdAndYearMonthWithCity(id, targetYearMonth).orElse(null);
        double avgFlightPrice = summary != null && summary.getAvgFlightPrice() != null ? summary.getAvgFlightPrice() : 0.0;
        double avgHotelPrice = summary != null && summary.getAvgHotelPrice() != null ? summary.getAvgHotelPrice() : 0.0;
        Exchange exchange = exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(city.getCountry().getCurrency()).orElse(null);

        LivingCostOfCity cost = livingCostOfCityRepository.findOneByCityId(id).orElse(null);
        double estimatedFood = estimateDailyFood(cost);
        double estimatedTransport = estimateDailyTransport(cost);
        double foodKrw = convertUsdCostToKrw(estimatedFood, usdExchange);
        double transportKrw = convertUsdCostToKrw(estimatedTransport, usdExchange);

        List<CityTag> cityTags = cityTagRepository.findCityTagsByCityId(id);
        List<String> selectedTags = normalizeSelectedTags(request, cityTags);

        double tagScore = calculateTagScore(id, selectedTags);
        Danger danger = dangerRepository.findByCountryId(city.getCountry().getId()).orElse(null);
        double safetyScore = calculateSafetyScore(danger);
        double budgetScore = calculateBudgetScore(request, avgFlightPrice, avgHotelPrice, foodKrw, transportKrw);
        double newsPenaltyScore = -Math.min(15.0, Math.max(0.0, nz(city.getNews_penalty_score())));
        double finalScore = clamp(tagScore + safetyScore + budgetScore + newsPenaltyScore, 0.0, 100.0);

        List<RecommendCitiesResponse.RecommendedPlace> places = buildRecommendedPlaces(id, selectedTags);
        RecommendCitiesResponse.NewsInsight newsInsight =
                newsSearchService.searchAndSummarize(city.getCityName(), city.getCountry().getCountryName(), newsPenaltyScore);

        String recommendationReason = narrationService.generateReason(
                new CityRankResult(
                        city.getId(),
                        city.getCountry().getId(),
                        city.getCountry().getCountryName(),
                        city.getCityName(),
                        city.getImgUrl(),
                        round(finalScore),
                        round(budgetScore),
                        round(safetyScore),
                        round(tagScore),
                        round(newsPenaltyScore),
                        city.getCountry().getCurrency().name(),
                        avgHotelPrice,
                        foodKrw + transportKrw,
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
                        place.description(),
                        place.location() != null ? place.location().lat() : null,
                        place.location() != null ? place.location().lon() : null,
                        place.imageUrl(),
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
                        round(finalScore),
                        round(budgetScore),
                        round(safetyScore),
                        round(tagScore),
                        round(newsPenaltyScore)
                ),
                recommendationReason,
                new RecommendCityDetailResponse.LivingCostFor1Day(foodKrw, transportKrw),
                new RecommendCityDetailResponse.AirTicketAndHotel(avgFlightPrice, avgHotelPrice),
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
        double estimatedFood = estimateDailyFood(cost);
        double estimatedTransport = estimateDailyTransport(cost);
        double foodKrw = convertUsdCostToKrw(estimatedFood, usdExchange);
        double transportKrw = convertUsdCostToKrw(estimatedTransport, usdExchange);

        List<NotRecommendCityDetailResponse.TagResponse> tags = cityTagRepository.findCityTagsByCityId(id).stream()
                .map(cityTag -> new NotRecommendCityDetailResponse.TagResponse(
                        cityTag.getTag().getName(),
                        cityTag.getTagScore()
                ))
                .toList();

        return new NotRecommendCityDetailResponse(
                city.getId(),
                city.getCityName(),
                new NotRecommendCityDetailResponse.LivingCostFor1Day(foodKrw, transportKrw),
                new NotRecommendCityDetailResponse.AirTicketAndHotel(avgFlightPrice, avgHotelPrice),
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
        if (request != null && request.selectedTags() != null && !request.selectedTags().isEmpty()) {
            return RecommendTagNormalizer.normalize(request.selectedTags());
        }
        return cityTags.stream()
                .map(cityTag -> cityTag.getTag().getName())
                .toList();
    }

    private double calculateTagScore(Long cityId, List<String> selectedTags) {
        if (selectedTags.isEmpty()) {
            return 0.0;
        }

        List<CityTag> matchedTags = cityTagRepository.findCityTagsByCityIdAndTagNames(cityId, selectedTags);
        if (matchedTags.isEmpty()) {
            return 0.0;
        }

        double tagRaw = matchedTags.stream()
                .map(CityTag::getTagScore)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        return Math.min(55.0, tagRaw * 55.0);
    }

    private double calculateSafetyScore(Danger danger) {
        if (danger == null) {
            return 15.0;
        }
        return hasText(danger.getAttention()) || hasText(danger.getAttentionPartial()) ? 7.5 : 15.0;
    }

    private double calculateBudgetScore(
            RecommendCitiesRequest request,
            double avgFlightPrice,
            double avgHotelPrice,
            double food,
            double transport
    ) {
        if (request == null || request.userDailyBudget() == null || request.travelDays() == null || request.travelDays() <= 0) {
            return 0.0;
        }

        double totalBudget = request.userDailyBudget() * request.travelDays();
        if (totalBudget <= 0) {
            return 0.0;
        }

        double expectedTotalCost = avgFlightPrice + ((avgHotelPrice + food + transport) * request.travelDays());
        double ratio = (totalBudget - expectedTotalCost) / totalBudget;

        return ratio >= 0
                ? Math.min(25.0, ratio * 25.0)
                : Math.max(-25.0, (ratio / 0.3) * 25.0);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private double nz(Number value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private double convertUsdCostToKrw(double usdCost, Exchange usdExchange) {
        if (usdCost <= 0) {
            return 0.0;
        }
        if (usdExchange == null || usdExchange.getKrwPer1cur() == null || usdExchange.getKrwPer1cur() <= 0) {
            return round(usdCost);
        }
        return Math.round(usdCost * usdExchange.getKrwPer1cur());
    }

    private double estimateDailyFood(LivingCostOfCity cost) {
        if (cost == null) {
            return 0.0;
        }
        return nz(cost.getLunchMenu()) * 1.5
                + nz(cost.getCappuccino())
                + nz(cost.getCokePepsi())
                + (nz(cost.getDinnerInAResturantFor2()) / 2.0);
    }

    private double estimateDailyTransport(LivingCostOfCity cost) {
        if (cost == null) {
            return 0.0;
        }
        return nz(cost.getLocalTransportTicket()) * 2.0;
    }

    private Exchange getLatestUsdExchange() {
        return exchangeRepository.findFirstByCurrencyOrderByEventDateDesc(Currency.USD).orElse(null);
    }
}
