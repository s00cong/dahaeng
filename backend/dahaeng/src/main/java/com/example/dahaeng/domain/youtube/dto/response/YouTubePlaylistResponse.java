package com.example.dahaeng.domain.youtube.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@Getter @Setter @NoArgsConstructor
public class YouTubePlaylistResponse {
    private List<PlaylistItem> items;

    @Getter @Setter @NoArgsConstructor
    public static class PlaylistItem {
        private String id;
        private Snippet snippet;
        private Status status;
    }

    @Getter @Setter @NoArgsConstructor
    public static class Snippet {
        private String title;
    }

    @Getter @Setter @NoArgsConstructor
    public static class Status {
        private String privacyStatus;
    }
}
