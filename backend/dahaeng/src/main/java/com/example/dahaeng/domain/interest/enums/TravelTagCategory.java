package com.example.dahaeng.domain.interest.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TravelTagCategory {
    VIBE("Vibe"),
    LANDSCAPE("Landscape"),
    ACTIVITY("Activity"),
    WHO("Who"),
    CLIMATE("Climate");

    private final String label;

    public static TravelTagCategory fromLabel(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        for (TravelTagCategory category : TravelTagCategory.values()) {
            if (category.label.equalsIgnoreCase(trimmed) || category.name().equalsIgnoreCase(trimmed)) {
                return category;
            }
        }
        return null;
    }
}
