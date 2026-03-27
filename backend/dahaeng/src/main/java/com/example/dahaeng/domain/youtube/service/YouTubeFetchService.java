package com.example.dahaeng.domain.youtube.service;

import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import com.example.dahaeng.domain.youtube.dto.response.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class YouTubeFetchService {

    private static final String YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public YouTubeApiResponse<YouTubePlaylistResponse> fetchPlaylists(String accessToken) {
        String url = YOUTUBE_API_BASE_URL + "/playlists?part=snippet,status&mine=true&maxResults=30";
        return callYouTubeApi(url, accessToken, YouTubePlaylistResponse.class);
    }

    public YouTubeApiResponse<YouTubePlaylistItemResponse> fetchPlaylistItems(String accessToken, String playlistId) {
        String url = YOUTUBE_API_BASE_URL + "/playlistItems?part=snippet,contentDetails&playlistId=" + playlistId + "&maxResults=20";
        return callYouTubeApi(url, accessToken, YouTubePlaylistItemResponse.class);
    }

    public YouTubeApiResponse<YouTubeSubscriptionResponse> fetchSubscriptions(String accessToken) {
        String url = YOUTUBE_API_BASE_URL + "/subscriptions?part=snippet&mine=true&maxResults=50";
        return callYouTubeApi(url, accessToken, YouTubeSubscriptionResponse.class);
    }

    public YouTubeApiResponse<YouTubeVideoResponse> fetchLikedVideos(String accessToken) {
        String url = YOUTUBE_API_BASE_URL + "/videos?part=snippet&myRating=like&maxResults=50";
        return callYouTubeApi(url, accessToken, YouTubeVideoResponse.class);
    }

    public YouTubeApiResponse<YouTubeVideoResponse> fetchVideoDetails(String accessToken, String videoId) {
        String url = YOUTUBE_API_BASE_URL + "/videos?part=snippet&id=" + videoId;
        return callYouTubeApi(url, accessToken, YouTubeVideoResponse.class);
    }

    public YouTubeApiResponse<YouTubeChannelResponse> fetchMyChannel(String accessToken) {
        String url = YOUTUBE_API_BASE_URL + "/channels?part=id,snippet&mine=true";
        return callYouTubeApi(url, accessToken, YouTubeChannelResponse.class);
    }

    private <T> YouTubeApiResponse<T> callYouTubeApi(String url, String token, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<T> response = restTemplate.exchange(url, HttpMethod.GET, entity, responseType);
            T body = response.getBody();
            String rawJson = toJson(body);
            return new YouTubeApiResponse<>(body, rawJson);
        } catch (Exception e) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR, "YouTube API 호출 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    private String toJson(Object body) {
        if (body == null) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class YouTubeApiResponse<T> {
        private T body;
        private String rawJson;

        public YouTubeApiResponse(T body, String rawJson) {
            this.body = body;
            this.rawJson = rawJson;
        }
    }
}