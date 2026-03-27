package com.example.dahaeng.domain.youtube.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.OffsetDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor
public class YouTubeSubscriptionResponse {
    private List<SubscriptionItem> items;

    @Getter @Setter @NoArgsConstructor
    public static class SubscriptionItem {
        private Snippet snippet;
    }

    @Getter @Setter @NoArgsConstructor
    public static class Snippet {
        private String title;
        private String description;
        private String publishedAt; // ISO 8601 string
        private ResourceId resourceId;
    }

    @Getter @Setter @NoArgsConstructor
    public static class ResourceId {
        private String channelId;
    }
}
