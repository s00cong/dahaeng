package com.example.dahaeng.domain.city.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * GET /api/cities/lookup?city_code=NEW_YORK 응답 DTO
 * ⚠️ 임시: MariaDB city 테이블 완성 시 삭제 예정
 */
@Getter
@Builder
public class CityLookupResponseDto {
    private String cityCode;
    private Long mongoId; // MongoDB에 저장된 hash 기반 cityId
}
