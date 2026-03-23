package com.example.dahaeng.domain.interest.config;

import com.example.dahaeng.domain.interest.enums.InterestSourceType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.Set;

@Configuration
public class InterestDictionaryConfig {

    // ... (생략) ...

    @Bean
    public Map<InterestSourceType, Double> sourceWeightMap() {
        return Map.of(
                InterestSourceType.PLAYLIST_VIDEO_TAG, 3.0,
                InterestSourceType.LIKED_VIDEO_TAG, 2.5,
                InterestSourceType.SUBSCRIPTION_TITLE, 2.0,
                InterestSourceType.PLAYLIST_TITLE, 1.5,
                InterestSourceType.PLAYLIST_VIDEO_TITLE, 1.0,
                InterestSourceType.LIKED_VIDEO_TITLE, 1.0
        );
    }
}
