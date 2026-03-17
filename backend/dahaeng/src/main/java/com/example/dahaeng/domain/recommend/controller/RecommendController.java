package com.example.dahaeng.domain.recommend.controller;

import com.example.dahaeng.domain.recommend.service.RecommendFacade;
import com.example.dahaeng.domain.recommend.dto.request.RecommendCitiesRequest;
import com.example.dahaeng.domain.recommend.dto.response.RecommendCitySummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recommend")
@RequiredArgsConstructor
public class RecommendController {
    private final RecommendFacade recommendFacade;

    @PostMapping
    public RecommendCitySummaryResponse getRecommendCities(@RequestBody RecommendCitiesRequest request) {
        return recommendFacade.recommend(request);
    }
}
