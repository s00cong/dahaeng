package com.example.dahaeng.domain.city.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;

import org.junit.jupiter.api.Test;

class RecommendCityDetailResponseTest {

    @Test
    void touristSpotResponse_exposesKoNameField() {
        String[] componentNames = Arrays.stream(RecommendCityDetailResponse.TouristSpotResponse.class.getRecordComponents())
                .map(component -> component.getName())
                .toArray(String[]::new);

        assertThat(componentNames).contains("koName");
    }
}
