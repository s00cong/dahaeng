package com.example.dahaeng.domain.livingcost.controller;

import java.util.List;

import org.apache.coyote.Response;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.livingcost.dto.request.LivingCostCardRequest;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostComparisonRequest;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostDetailRequest;
import com.example.dahaeng.domain.livingcost.dto.request.LivingCostSearchRequest;
import com.example.dahaeng.domain.livingcost.dto.response.card.LivingCostCardResponse;
import com.example.dahaeng.domain.livingcost.dto.response.card.LivingCostSearchedCard;
import com.example.dahaeng.domain.livingcost.dto.response.compare.LivingCostComparisonResponse;
import com.example.dahaeng.domain.livingcost.dto.response.detail.LivingCostDetailResponse;
import com.example.dahaeng.domain.livingcost.dto.response.search.LivingCostSearchedResponse;
import com.example.dahaeng.domain.livingcost.service.LivingCostService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cost")
@Slf4j
public class LivingCostController {

	private final LivingCostService costService;

	@GetMapping("/detail")
	public ResponseEntity<LivingCostDetailResponse> detail(@ModelAttribute LivingCostDetailRequest request) {
		return ResponseEntity.ok(costService.detail(request));
	}

	@GetMapping("/compare")
	public ResponseEntity<LivingCostComparisonResponse> compare(@ModelAttribute LivingCostComparisonRequest request) {
		return ResponseEntity.ok(costService.comparison(request));
	}

	@GetMapping("/card")
	public ResponseEntity<LivingCostCardResponse> card(@ModelAttribute LivingCostCardRequest request) {
		return ResponseEntity.ok(costService.card(request));
	}

	@GetMapping("/search")
	public ResponseEntity<LivingCostSearchedResponse> search(@ModelAttribute LivingCostSearchRequest request) {
		return ResponseEntity.ok(costService.search(request));
	}
}
