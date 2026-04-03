package com.example.dahaeng.domain.flightalert.controller;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.dahaeng.domain.flightalert.service.FlightAlertBatchService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FlightAlertInternalControllerTest {

	@Mock
	private FlightAlertBatchService batchService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		FlightAlertInternalController controller = new FlightAlertInternalController(batchService, "test-token");
		mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
	}

	@Test
	void runBatchReturnsAcceptedWhenTokenMatches() throws Exception {
		mockMvc.perform(post("/api/internal/flight-alerts/run")
				.header("X-Internal-Token", "test-token"))
			.andExpect(status().isAccepted())
			.andExpect(jsonPath("$.status").value("triggered"));

		verify(batchService).evaluateActiveSubscriptions();
	}

	@Test
	void runBatchReturnsForbiddenWhenTokenDoesNotMatch() throws Exception {
		mockMvc.perform(post("/api/internal/flight-alerts/run")
				.header("X-Internal-Token", "wrong-token"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.message").value("invalid internal token"));

		verify(batchService, never()).evaluateActiveSubscriptions();
	}
}
