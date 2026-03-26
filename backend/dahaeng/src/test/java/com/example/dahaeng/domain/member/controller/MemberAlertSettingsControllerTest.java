package com.example.dahaeng.domain.member.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.member.dto.MemberDto;
import com.example.dahaeng.domain.member.dto.request.UpdateAlertSettingsRequest;
import com.example.dahaeng.domain.member.dto.response.AlertSettingsResponse;
import com.example.dahaeng.domain.member.service.MemberService;

@ExtendWith(MockitoExtension.class)
class MemberAlertSettingsControllerTest {

	@Mock
	private MemberService memberService;

	private MockMvc mockMvc;
	private CustomOAuth2User user;

	@BeforeEach
	void setUp() {
		MemberAlertSettingsController controller = new MemberAlertSettingsController(memberService);
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
			.setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver(user))
			.build();
	}

	@Test
	void getAlertSettingsReturnsEmailAlertEnabled() throws Exception {
		when(memberService.getAlertSettings(1L)).thenReturn(new AlertSettingsResponse(true));

		mockMvc.perform(get("/api/members/me/alert-settings"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.emailAlertEnabled").value(true));

		verify(memberService).getAlertSettings(1L);
	}

	@Test
	void updateAlertSettingsReturnsUpdatedValue() throws Exception {
		when(memberService.updateAlertSettings(eq(1L), eq(new UpdateAlertSettingsRequest(false))))
			.thenReturn(new AlertSettingsResponse(false));

		mockMvc.perform(patch("/api/members/me/alert-settings")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"emailAlertEnabled":false}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.emailAlertEnabled").value(false));

		verify(memberService).updateAlertSettings(1L, new UpdateAlertSettingsRequest(false));
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
