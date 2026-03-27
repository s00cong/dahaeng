package com.example.dahaeng.domain.youtube.service;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.interest.service.InterestResultSaver;
import com.example.dahaeng.domain.interest.service.KeywordExtractionEngine;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.domain.youtube.dto.response.YouTubeChannelResponse;
import com.example.dahaeng.domain.youtube.dto.response.YouTubePlaylistItemResponse;
import com.example.dahaeng.domain.youtube.dto.response.YouTubePlaylistResponse;
import com.example.dahaeng.domain.youtube.dto.response.YouTubeSubscriptionResponse;
import com.example.dahaeng.domain.youtube.dto.response.YouTubeVideoResponse;
import com.example.dahaeng.domain.youtube.entity.YouTubeAccount;
import com.example.dahaeng.domain.youtube.entity.YouTubePlaylist;
import com.example.dahaeng.domain.youtube.entity.YouTubeVideo;
import com.example.dahaeng.domain.youtube.enums.PrivacyStatus;
import com.example.dahaeng.domain.youtube.enums.SnapshotType;
import com.example.dahaeng.domain.youtube.enums.SyncStatus;
import com.example.dahaeng.domain.youtube.repository.YouTubeAccountRepository;
import com.example.dahaeng.domain.youtube.service.YouTubeFetchService.YouTubeApiResponse;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class YouTubeSyncService {

    private final MemberRepository memberRepository;
    private final YouTubeAccountRepository accountRepository;
    private final YouTubeFetchService fetchService;
    private final YouTubeSaveService saveService;
    private final KeywordExtractionEngine keywordExtractionEngine;
    private final InterestResultSaver interestResultSaver;

    @Transactional
    public void sync(CustomOAuth2User principal) {
        Member member = getAuthenticatedMember(principal);
        YouTubeAccount account = getYouTubeAccount(member);
        String accessToken = account.getAccessToken();
        LocalDateTime now = LocalDateTime.now();

        account = updateAccountInfo(account, accessToken);

        try {
            saveService.updateSyncStatus(account, SyncStatus.PENDING, account.getLastSyncedAt());

            Map<String, YouTubePlaylist> playlistMap = syncPlaylists(account, accessToken, now);

            Set<String> videoIds = new HashSet<>();
            Map<String, List<RawPlaylistItem>> playlistItemsMap =
                    collectPlaylistItems(account, accessToken, playlistMap.keySet(), videoIds, now);

            syncSubscriptions(account, accessToken, now);

            List<String> likedVideoIds = collectLikedVideoIds(account, accessToken, videoIds, now);

            Map<String, YouTubeVideo> videoMap = syncVideoDetails(accessToken, videoIds, now);

            finalizeRelations(account, playlistMap, playlistItemsMap, videoMap, likedVideoIds, now);
            extractAndSaveKeywordsSafely(account.getId());

            saveService.replaceSnapshot(account, SnapshotType.FULL_SYNC, "{\"status\":\"ok\"}", now);
            saveService.updateSyncStatus(account, SyncStatus.SYNCED, now);
        } catch (Exception e) {
            saveService.updateSyncStatus(account, SyncStatus.FAILED, account.getLastSyncedAt());
            if (e instanceof CustomException) {
                throw e;
            }
            throw new CustomException(ErrorCode.INTERNAL_ERROR, "YouTube sync failed.", e.getMessage());
        }
    }

    private Member getAuthenticatedMember(CustomOAuth2User principal) {
        return memberRepository.findById(principal.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "User not found."));
    }

    private YouTubeAccount getYouTubeAccount(Member member) {
        YouTubeAccount account = accountRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED, "Google account is not linked."));

        if (account.getAccessToken() == null || account.getAccessToken().isBlank()) {
            throw new CustomException(ErrorCode.UNAUTHORIZED, "Google account is not linked.");
        }
        if (!account.isSyncEnabledEffective()) {
            throw new CustomException(ErrorCode.OPERATION_NOT_ALLOWED, "YouTube sync is disabled by user preference.");
        }
        return account;
    }

    private YouTubeAccount updateAccountInfo(YouTubeAccount account, String accessToken) {
        YouTubeApiResponse<YouTubeChannelResponse> channelResp = fetchService.fetchMyChannel(accessToken);
        if (channelResp.getBody().getItems().isEmpty()) {
            throw new CustomException(ErrorCode.EXTERNAL_API_BAD_RESPONSE, "Channel information not found.");
        }
        String channelId = channelResp.getBody().getItems().get(0).getId();

        return saveService.upsertAccount(
                account.getMember(),
                channelId,
                account.getMember().getEmail(),
                account.getAccessToken(),
                account.getRefreshToken(),
                account.getTokenExpiresAt()
        );
    }

    private Map<String, YouTubePlaylist> syncPlaylists(YouTubeAccount account, String accessToken, LocalDateTime now) {
        YouTubeApiResponse<YouTubePlaylistResponse> playlistsResp = fetchService.fetchPlaylists(accessToken);
        saveService.replaceSnapshot(account, SnapshotType.PLAYLISTS, playlistsResp.getRawJson(), now);

        Map<String, YouTubePlaylist> playlistMap = new HashMap<>();
        Set<String> latestPlaylistIds = new HashSet<>();

        for (YouTubePlaylistResponse.PlaylistItem plItem : playlistsResp.getBody().getItems()) {
            String playlistId = plItem.getId();
            YouTubePlaylist saved = saveService.upsertPlaylist(
                    account,
                    playlistId,
                    plItem.getSnippet().getTitle(),
                    PrivacyStatus.valueOf(plItem.getStatus().getPrivacyStatus().toUpperCase()),
                    now
            );
            playlistMap.put(playlistId, saved);
            latestPlaylistIds.add(playlistId);
        }
        saveService.deleteStalePlaylists(account, latestPlaylistIds);
        return playlistMap;
    }

    private Map<String, List<RawPlaylistItem>> collectPlaylistItems(
            YouTubeAccount account,
            String accessToken,
            Set<String> playlistIds,
            Set<String> videoIds,
            LocalDateTime now
    ) {
        Map<String, List<RawPlaylistItem>> playlistItemsByPlaylist = new HashMap<>();
        for (String playlistId : playlistIds) {
            YouTubeApiResponse<YouTubePlaylistItemResponse> itemsResp =
                    fetchService.fetchPlaylistItems(accessToken, playlistId);
            saveService.replaceSnapshot(account, SnapshotType.PLAYLIST_ITEMS, itemsResp.getRawJson(), now);

            List<RawPlaylistItem> rawItems = new ArrayList<>();
            for (YouTubePlaylistItemResponse.PlaylistItem item : itemsResp.getBody().getItems()) {
                String videoId = item.getContentDetails().getVideoId();
                rawItems.add(new RawPlaylistItem(videoId, item.getSnippet().getPosition()));
                videoIds.add(videoId);
            }
            playlistItemsByPlaylist.put(playlistId, rawItems);
        }
        return playlistItemsByPlaylist;
    }

    private void syncSubscriptions(YouTubeAccount account, String accessToken, LocalDateTime now) {
        YouTubeApiResponse<YouTubeSubscriptionResponse> subscriptionsResp = fetchService.fetchSubscriptions(accessToken);
        saveService.replaceSnapshot(account, SnapshotType.SUBSCRIPTIONS, subscriptionsResp.getRawJson(), now);

        List<YouTubeSaveService.SubscriptionInput> inputs = new ArrayList<>();
        for (YouTubeSubscriptionResponse.SubscriptionItem subItem : subscriptionsResp.getBody().getItems()) {
            YouTubeSubscriptionResponse.Snippet s = subItem.getSnippet();
            inputs.add(new YouTubeSaveService.SubscriptionInput(
                    s.getResourceId().getChannelId(),
                    s.getTitle(),
                    s.getDescription(),
                    parseDateTime(s.getPublishedAt())
            ));
        }
        saveService.replaceSubscriptions(account, inputs, now);
    }

    private List<String> collectLikedVideoIds(
            YouTubeAccount account,
            String accessToken,
            Set<String> videoIds,
            LocalDateTime now
    ) {
        YouTubeApiResponse<YouTubeVideoResponse> likedResp = fetchService.fetchLikedVideos(accessToken);
        saveService.replaceSnapshot(account, SnapshotType.LIKED_VIDEOS, likedResp.getRawJson(), now);

        List<String> likedVideoIds = new ArrayList<>();
        for (YouTubeVideoResponse.VideoItem item : likedResp.getBody().getItems()) {
            likedVideoIds.add(item.getId());
            videoIds.add(item.getId());
        }
        return likedVideoIds;
    }

    private Map<String, YouTubeVideo> syncVideoDetails(String accessToken, Set<String> videoIds, LocalDateTime now) {
        Map<String, YouTubeVideo> videoMap = new HashMap<>();
        for (String videoId : videoIds) {
            YouTubeApiResponse<YouTubeVideoResponse> videoResp = fetchService.fetchVideoDetails(accessToken, videoId);

            if (videoResp.getBody().getItems().isEmpty()) {
                continue;
            }

            YouTubeVideoResponse.VideoItem item = videoResp.getBody().getItems().get(0);
            YouTubeVideoResponse.Snippet s = item.getSnippet();

            YouTubeVideo saved = saveService.upsertVideo(videoId, s.getTitle(), s.getChannelTitle(), s.getCategoryId());
            saveService.replaceVideoTags(saved, s.getTags());
            videoMap.put(videoId, saved);
        }
        return videoMap;
    }

    private void finalizeRelations(
            YouTubeAccount account,
            Map<String, YouTubePlaylist> playlistMap,
            Map<String, List<RawPlaylistItem>> playlistItemsMap,
            Map<String, YouTubeVideo> videoMap,
            List<String> likedVideoIds,
            LocalDateTime now
    ) {
        for (Map.Entry<String, List<RawPlaylistItem>> entry : playlistItemsMap.entrySet()) {
            YouTubePlaylist playlist = playlistMap.get(entry.getKey());
            List<YouTubeSaveService.PlaylistVideoInput> inputs = new ArrayList<>();
            for (RawPlaylistItem item : entry.getValue()) {
                YouTubeVideo video = videoMap.get(item.videoId());
                if (video != null) {
                    inputs.add(new YouTubeSaveService.PlaylistVideoInput(video, item.position()));
                }
            }
            saveService.replacePlaylistVideos(playlist, inputs, now);
        }

        List<YouTubeVideo> likedVideoEntities = new ArrayList<>();
        for (String videoId : likedVideoIds) {
            YouTubeVideo video = videoMap.get(videoId);
            if (video != null) {
                likedVideoEntities.add(video);
            }
        }
        saveService.replaceLikedVideos(account, likedVideoEntities, now);
    }

    private void extractAndSaveKeywordsSafely(Long accountId) {
        try {
            var features = keywordExtractionEngine.extractFeatures(accountId);
            interestResultSaver.saveKeywords(accountId, features.getAllKeywords());
        } catch (Exception e) {
            System.out.println(">>> [KEYWORD EXTRACTION SKIP] Failed to extract keywords for account " + accountId
                    + ": " + e.getMessage());
        }
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value).toLocalDateTime();
        } catch (Exception e) {
            return null;
        }
    }

    private record RawPlaylistItem(String videoId, Integer position) {}
}
