package com.example.dahaeng.domain.place.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Service;

import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GeoapifyService {
	private final StringRedisTemplate stringRedisTemplate;
	private final CityRepository cityRepository;
	private final ObjectMapper om;

	@Value("${geoapify.category}")
	private String CATEGORY;
	private final String prefix = "geoapify:places:";
	private final String subfix = ":city:";

	public JsonNode nearby(Long cityId) throws JsonProcessingException {
		cityRepository.findById(cityId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 도시 아이디입니다"));

		ValueOperations<String, String> ops = stringRedisTemplate.opsForValue();
		String key = new StringBuilder(prefix)
			.append(CATEGORY)
			.append(subfix).
			append(cityId).toString();

		String value = ops.get(key);
		if (value == null || value.isBlank()) {
			return om.createObjectNode()
				.put("type", "FeatureCollection")
				.set("features", om.createArrayNode());
		}

		return om.readTree(value);
	}
}
