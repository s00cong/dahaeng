package com.example.dahaeng.domain.city.controller;

import com.example.dahaeng.domain.city.dto.response.AllCitiesResponse;
import com.example.dahaeng.domain.city.dto.response.CityResponse;
import com.example.dahaeng.domain.city.dto.response.NotRecommendCityDetailResponse;
import com.example.dahaeng.domain.city.dto.response.RecommendCityDetailResponse;
import com.example.dahaeng.domain.city.service.CityService;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.repository.query.Param;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/city")
@RequiredArgsConstructor
public class CityController {
    private final CityService cityService;

    @GetMapping("")
    public ResponseEntity<List<AllCitiesResponse>> getAllCities() {
        return ResponseEntity.ok(cityService.getAllCities());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCityDetail(
            @PathVariable("id") Long id,
            @RequestParam("recommend") Boolean recommend,
            @RequestParam(value = "selectedTags", required = false) List<String> selectedTags,
            @RequestParam(value = "userDailyBudget", required = false) Double userDailyBudget,
            @RequestParam(value = "travelDays", required = false) Integer travelDays,
            @RequestParam(value = "month", required = false) Integer month,
            @RequestParam(value = "recommendId", required = false) UUID recommendId
    ) {
        if (recommend) {
            RecommendCitiesRequest request = new RecommendCitiesRequest(selectedTags, userDailyBudget, travelDays, month, recommendId);
            RecommendCityDetailResponse recommendCityDetailResponse = cityService.getRecommendCityDetail(id, request);
            return ResponseEntity.ok(recommendCityDetailResponse);
        }

        NotRecommendCityDetailResponse notRecommendCityDetailResponse = cityService.getNotRecommendCityDetail(id);
        return ResponseEntity.ok(notRecommendCityDetailResponse);
    }

    @GetMapping("/list")
    public ResponseEntity<List<CityResponse>> list(@Param("countryId") Long countryId) {
        return ResponseEntity.ok(cityService.list(countryId));
    }
}
