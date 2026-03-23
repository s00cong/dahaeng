package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.constant.TravelTagCatalog;
import com.example.dahaeng.domain.interest.enums.TravelTagCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 자바 상수(TravelTagCatalog) 기반의 태그 공급자 구현체입니다.
 * 나중에 DB 기반으로 전환할 때 이 @Primary 어노테이션을 새로운 DB 구현체로 옮기면 됩니다.
 */
@Service
@Primary
@RequiredArgsConstructor
public class ConstantTravelTagProvider implements TravelTagProvider {

    @Override
    public String getAllowedTagsPrompt() {
        return TravelTagCatalog.getAllowedTagsPrompt();
    }

    @Override
    public boolean isValid(String categoryLabel, String tag) {
        return TravelTagCatalog.isValid(categoryLabel, tag);
    }

    @Override
    public TravelTagCategory fromLabel(String label) {
        return TravelTagCategory.fromLabel(label);
    }

    @Override
    public Map<TravelTagCategory, List<String>> getAllTagsMap() {
        return TravelTagCatalog.ALLOWED_TAGS;
    }
}
