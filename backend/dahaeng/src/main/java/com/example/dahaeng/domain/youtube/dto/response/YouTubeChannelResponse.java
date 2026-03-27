package com.example.dahaeng.domain.youtube.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@Getter @Setter @NoArgsConstructor
public class YouTubeChannelResponse {
    private List<ChannelItem> items;

    @Getter @Setter @NoArgsConstructor
    public static class ChannelItem {
        private String id;
    }
}
