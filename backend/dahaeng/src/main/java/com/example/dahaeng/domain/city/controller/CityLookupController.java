package com.example.dahaeng.domain.city.controller;

import com.example.dahaeng.domain.city.dto.CityLookupResponseDto;
import com.example.dahaeng.domain.city.util.SparkHashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * ⚠️ 임시 컨트롤러: MariaDB city 테이블이 완성되면 삭제하거나 FlightController로 통합 예정
 *
 * 프론트엔드가 city_code("NEW_YORK")를 알고 있을 때,
 * MongoDB 조회에 사용할 mongoId(hash값)를 받아가는 용도.
 */
@RestController
@RequestMapping("/api/cities")
@RequiredArgsConstructor
public class CityLookupController {

    /**
     * GET /api/cities/lookup?city_code=NEW_YORK
     * → { "cityCode": "NEW_YORK", "mongoId": 6920208 }
     */
    @GetMapping("/lookup")
    public ResponseEntity<CityLookupResponseDto> lookup(
            @RequestParam("city_code") String cityCode) {

        long mongoId = SparkHashUtil.computeMongoId(cityCode);

        return ResponseEntity.ok(
                CityLookupResponseDto.builder()
                        .cityCode(cityCode)
                        .mongoId(mongoId)
                        .build());
    }
}
