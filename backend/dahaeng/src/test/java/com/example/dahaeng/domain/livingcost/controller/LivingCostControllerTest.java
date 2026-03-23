package com.example.dahaeng.domain.livingcost.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.dahaeng.domain.livingcost.dto.request.LivingCostDetailRequest;
import com.example.dahaeng.domain.livingcost.dto.response.detail.LivingCostDetailResponse;
import com.example.dahaeng.domain.livingcost.enums.TargetType;
import com.example.dahaeng.domain.livingcost.service.LivingCostService;

@ExtendWith(MockitoExtension.class)
class LivingCostControllerTest {

	@Mock
	private LivingCostService service;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		LivingCostController controller = new LivingCostController(service);
		mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
	}

	@Test
	void detail_withCityTarget_callsCityService() throws Exception {
		when(service.detail(new LivingCostDetailRequest(TargetType.CITY, 1L)))
			.thenReturn(new LivingCostDetailResponse("city", null, null));

		mockMvc.perform(get("/api/cost/detail")
				.param("targetType", "CITY")
				.param("targetId", "1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.targetType").value("city"));

		verify(service).detail(new LivingCostDetailRequest(TargetType.CITY, 1L));
	}

	@Test
	void detail_withCountryTarget_callsCountryService() throws Exception {
		when(service.detail(new LivingCostDetailRequest(TargetType.COUNTRY, 2L)))
			.thenReturn(new LivingCostDetailResponse("country", null, null));

		mockMvc.perform(get("/api/cost/detail")
				.param("targetType", "COUNTRY")
				.param("targetId", "2"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.targetType").value("country"));

		verify(service).detail(new LivingCostDetailRequest(TargetType.COUNTRY, 2L));
	}
}
