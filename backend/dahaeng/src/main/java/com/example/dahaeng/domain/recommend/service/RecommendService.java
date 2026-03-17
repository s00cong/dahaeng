package com.example.dahaeng.domain.recommend.service;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.repository.CityRepository;

import com.example.dahaeng.domain.city.repository.CityTagRepository;
import com.example.dahaeng.domain.country.repository.DangerRepository;
import com.example.dahaeng.domain.flight.repository.FlightSummaryRepository;
import com.example.dahaeng.domain.livingcost.repository.LivingCostOfCityRepository;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;
import com.example.dahaeng.domain.recommend.dto.response.RecommendCitiesResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendService {
    private final CityRepository cityRepository;
    private final FlightSummaryRepository flightSummaryRepository;
    private final LivingCostOfCityRepository livingCostOfCityRepository;
    private final DangerRepository dangerRepository;
    private final CityTagRepository cityTagRepository;
    public List<RecommendCitiesResponse> getRecommendCitiesList(RecommendCitiesRequest request){
        List<City> allCities = cityRepository.findAll();
        List<Long> cityIds = allCities.stream().map(City::getId).toList();
        List<Long> countryIds = allCities.stream().map(c -> c.getCountry().getId()).distinct().toList();

        return null;

    }
}
