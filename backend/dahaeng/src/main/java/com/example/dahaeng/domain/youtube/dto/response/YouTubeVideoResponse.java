package com.example.dahaeng.domain.youtube.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@Getter @Setter @NoArgsConstructor
public class YouTubeVideoResponse {
    private List<VideoItem> items;

    @Getter @Setter @NoArgsConstructor
    public static class VideoItem {
        private String id;
        private Snippet snippet;
    }

    @Getter @Setter @NoArgsConstructor
    public static class Snippet {
        private String title;
        private String channelTitle;
        private String categoryId;
        private List<String> tags;
    }
}
