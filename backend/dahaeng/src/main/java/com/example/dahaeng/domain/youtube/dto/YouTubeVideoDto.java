package com.example.dahaeng.domain.youtube.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YouTubeVideoDto {
    private String id;
    private String title;
    private String channelTitle; // 채널명
    private String categoryId;   // 카테고리 ID
    private List<String> tags;   // 동영상 태그 리스트
}
