package com.example.dahaeng.config;

import com.example.dahaeng.domain.auth.config.SecurityConfig;
import com.example.dahaeng.domain.auth.jwt.JwtUtil;
import com.example.dahaeng.domain.auth.oauth2.CustomSuccessHandler;
import com.example.dahaeng.domain.auth.service.CustomOAuth2UserService;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.global.controller.RootController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = SwaggerIntegrationTest.TestApplication.class,
        properties = {
                "spring.jwt.secret=YWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJjYWJj",
                "spring.jwt.access-expiration=3600000",
                "spring.jwt.refresh-expiration=604800000",
                "app.front-callback-url=http://localhost:3000",
                "spring.security.oauth2.client.registration.google.client-id=test-client",
                "spring.security.oauth2.client.registration.google.client-secret=test-secret",
                "spring.security.oauth2.client.registration.google.scope=profile,email",
                "external.newsapi.key=test-key",
                "external.newsapi.base-url=https://example.com",
                "external.google-places.key=test-key",
                "external.google-places.base-url=https://example.com"
        }
)
@AutoConfigureMockMvc
class SwaggerIntegrationTest {
	
	@Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomOAuth2UserService customOAuth2UserService;

    @MockitoBean
    private CustomSuccessHandler customSuccessHandler;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private MemberRepository memberRepository;

    @MockitoBean
    private ClientRegistrationRepository clientRegistrationRepository;

    @Test
    void apiDocs_exposesBearerSecurityScheme() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"));
    }

    @Test
    void swaggerUi_isAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Swagger UI")));
    }

    @TestConfiguration
    @EnableAutoConfiguration
    @ComponentScan(basePackageClasses = {
            RootController.class,
            SecurityConfig.class
    })
    static class TestApplication {
    }
}
