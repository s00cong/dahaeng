package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.enums.TravelTagCategory;
import com.example.dahaeng.domain.tag.entity.Tag;
import com.example.dahaeng.domain.tag.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * [FUTURE_CANDIDATE] DB 기반의 태그 공급자 구현체입니다.
 * DB 연동 준비가 완료되었을 때, ConstantTravelTagProvider의 @Primary를 이 클래스로 옮겨주세요.
 */
@Service
@RequiredArgsConstructor
public class DatabaseTravelTagProvider implements TravelTagProvider {

    private final TagRepository tagRepository;

    @Override
    public String getAllowedTagsPrompt() {
        // 1. DB에서 모든 태그 조회
        List<Tag> tags = tagRepository.findAll();
        
        // 2. 카테고리별로 그룹화하여 AI 프롬프트 생성
        // (현재 Tag 엔티티에 Category 연관 관계가 있다고 가정)
        return tags.stream()
                .collect(Collectors.groupingBy(t -> t.getCategory().getName()))
                .entrySet().stream()
                .map(e -> "- " + e.getKey() + ": " + e.getValue().stream().map(Tag::getName).collect(Collectors.joining(", ")))
                .collect(Collectors.joining("\n"));
    }

    @Override
    public boolean isValid(String categoryLabel, String tag) {
        // DB에서 해당 카테고리와 태그명이 일치하는 데이터가 있는지 확인
        return tagRepository.findAll().stream()
                .anyMatch(t -> t.getCategory().getName().equalsIgnoreCase(categoryLabel) 
                            && t.getName().equalsIgnoreCase(tag));
    }

    @Override
    public TravelTagCategory fromLabel(String label) {
        // 기존 Enum 로직 활용
        return TravelTagCategory.fromLabel(label);
    }

    @Override
    public Map<TravelTagCategory, List<String>> getAllTagsMap() {
        // DB 데이터를 TravelTagCategory Enum 맵으로 변환
        return tagRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                    t -> TravelTagCategory.fromLabel(t.getCategory().getName()),
                    Collectors.mapping(Tag::getName, Collectors.toList())
                ));
    }
}
