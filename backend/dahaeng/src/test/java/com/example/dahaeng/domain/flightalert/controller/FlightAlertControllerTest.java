package com.example.dahaeng.domain.flightalert.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.flightalert.dto.request.UpsertFlightAlertSubscriptionRequest;
import com.example.dahaeng.domain.flightalert.dto.response.FlightAlertNotificationResponse;
import com.example.dahaeng.domain.flightalert.dto.response.UnreadFlightAlertCountResponse;
import com.example.dahaeng.domain.flightalert.entity.AlertType;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.service.FlightAlertNotificationService;
import com.example.dahaeng.domain.flightalert.service.FlightAlertSubscriptionService;
import com.example.dahaeng.domain.member.dto.MemberDto;
import com.example.dahaeng.global.dto.response.PageResponse;

@ExtendWith(MockitoExtension.class)
class FlightAlertControllerTest {

	@Mock
	private FlightAlertSubscriptionService subscriptionService;

	@Mock
	private FlightAlertNotificationService notificationService;

	private MockMvc mockMvc;
	private CustomOAuth2User user;

	@BeforeEach
	void setUp() {
		FlightAlertController controller = new FlightAlertController(subscriptionService, notificationService);
		user = new CustomOAuth2User(
			MemberDto.builder()
				.id(1L)
				.role("ROLE_USER")
				.nickname("tester")
				.email("test@example.com")
				.socialId("social-id")
				.build(),
			null
		);
		mockMvc = MockMvcBuilders.standaloneSetup(controller)
			.setCustomArgumentResolvers(
				new AuthenticationPrincipalArgumentResolver(user),
				new PageableHandlerMethodArgumentResolver()
			)
			.build();
	}

	@Test
	void getNotifications_returnsSummaryFields() throws Exception {
		when(notificationService.getNotifications(eq(1L), any())).thenReturn(new PageResponse<>(
			List.of(new FlightAlertNotificationResponse(
				33L,
				101L,
				"Tokyo",
				AlertType.TARGET_HIT,
				350_000,
				328_000,
				LocalDate.parse("2026-04-12"),
				LocalDate.parse("2026-05-14"),
				3,
				LocalDateTime.parse("2026-03-23T00:00:00"),
				false,
				LocalDateTime.parse("2026-03-23T09:00:00")
			)),
			0,
			10,
			1,
			1,
			false
		));

		mockMvc.perform(get("/api/flight-alerts/notifications"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[0].nearestMatchDate[0]").value(2026))
			.andExpect(jsonPath("$.content[0].nearestMatchDate[1]").value(4))
			.andExpect(jsonPath("$.content[0].nearestMatchDate[2]").value(12))
			.andExpect(jsonPath("$.content[0].bestPriceDate[0]").value(2026))
			.andExpect(jsonPath("$.content[0].bestPriceDate[1]").value(5))
			.andExpect(jsonPath("$.content[0].bestPriceDate[2]").value(14))
			.andExpect(jsonPath("$.content[0].matchedDateCount").value(3))
			.andExpect(jsonPath("$.content[0].collectedAt[0]").value(2026))
			.andExpect(jsonPath("$.content[0].collectedAt[1]").value(3))
			.andExpect(jsonPath("$.content[0].collectedAt[2]").value(23))
			.andExpect(jsonPath("$.content[0].collectedAt[3]").value(0))
			.andExpect(jsonPath("$.content[0].collectedAt[4]").value(0));

		verify(notificationService).getNotifications(eq(1L), any());
	}

	@Test
	void upsertSubscription_returnsSubscriptionResponse() throws Exception {
		FlightAlertSubscription subscription = FlightAlertSubscription.builder()
			.id(12L)
			.city(com.example.dahaeng.domain.city.entity.City.builder()
				.id(101L)
				.cityName("Tokyo")
				.country(com.example.dahaeng.domain.country.entity.Country.builder()
					.id(1L)
					.countryName("Japan")
					.build())
				.build())
			.member(com.example.dahaeng.domain.member.entity.Member.builder()
				.id(1L)
				.email("test@example.com")
				.nickname("tester")
				.role("ROLE_USER")
				.socialId("social-id")
				.build())
			.thresholdPrice(350_000)
			.enabled(true)
			.build();
		when(subscriptionService.upsert(eq(1L), eq(101L), eq(new UpsertFlightAlertSubscriptionRequest(350_000))))
			.thenReturn(subscription);

		mockMvc.perform(put("/api/flight-alerts/subscriptions/101")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"thresholdPrice":350000}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.subscriptionId").value(12))
			.andExpect(jsonPath("$.cityId").value(101))
			.andExpect(jsonPath("$.thresholdPrice").value(350000));

		verify(subscriptionService).upsert(eq(1L), eq(101L), eq(new UpsertFlightAlertSubscriptionRequest(350_000)));
	}

	@Test
	void getUnreadCount_returnsUnreadCount() throws Exception {
		when(notificationService.getUnreadCount(1L)).thenReturn(new UnreadFlightAlertCountResponse(3));

		mockMvc.perform(get("/api/flight-alerts/notifications/unread-count"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.count").value(3));

		verify(notificationService).getUnreadCount(1L);
	}

	private record AuthenticationPrincipalArgumentResolver(CustomOAuth2User user)
		implements HandlerMethodArgumentResolver {

		@Override
		public boolean supportsParameter(MethodParameter parameter) {
			return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
				&& parameter.getParameterType().equals(CustomOAuth2User.class);
		}

		@Override
		public Object resolveArgument(
			MethodParameter parameter,
			ModelAndViewContainer mavContainer,
			NativeWebRequest webRequest,
			WebDataBinderFactory binderFactory
		) {
			return user;
		}
	}
}
