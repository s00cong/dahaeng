package com.example.dahaeng.domain.youtube.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@Getter @Setter @NoArgsConstructor
public class YouTubePlaylistItemResponse {
    private List<PlaylistItem> items;

    @Getter @Setter @NoArgsConstructor
    public static class PlaylistItem {
        private Snippet snippet;
        private ContentDetails contentDetails;
    }

    @Getter @Setter @NoArgsConstructor
    public static class Snippet {
        private Integer position;
    }

    @Getter @Setter @NoArgsConstructor
    public static class ContentDetails {
        private String videoId;
    }
}
