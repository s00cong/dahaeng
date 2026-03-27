package com.example.dahaeng.domain.interest.dto;

import com.example.dahaeng.domain.interest.enums.InterestSourceType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class TokenizedSignal {
    private final String rawToken;
    private final InterestSourceType sourceType;
    private final LocalDateTime signalTime; // 신호 발생 시각 추가
}
