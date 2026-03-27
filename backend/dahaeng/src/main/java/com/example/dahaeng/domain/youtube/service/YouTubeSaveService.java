package com.example.dahaeng.domain.youtube.service;

import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.youtube.entity.*;
import com.example.dahaeng.domain.youtube.enums.PrivacyStatus;
import com.example.dahaeng.domain.youtube.enums.SnapshotType;
import com.example.dahaeng.domain.youtube.enums.SyncStatus;
import com.example.dahaeng.domain.youtube.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class YouTubeSaveService {

    private final YouTubeAccountRepository accountRepository;
    private final YouTubePlaylistRepository playlistRepository;
    private final YouTubeVideoRepository videoRepository;
    private final YouTubePlaylistVideoRepository playlistVideoRepository;
    private final YouTubeLikedVideoRepository likedVideoRepository;
    private final YouTubeSubscriptionRepository subscriptionRepository;
    private final YouTubeVideoTagRepository videoTagRepository;
    private final YouTubeSyncSnapshotRepository snapshotRepository;

    public YouTubeAccount upsertAccount(Member member, String youtubeChannelId, String googleEmail, String accessToken, String refreshToken, LocalDateTime tokenExpiresAt) {
        Optional<YouTubeAccount> existing = accountRepository.findByMemberId(member.getId());
        
        if (existing.isPresent()) {
            YouTubeAccount account = existing.get();
            account.updateChannelInfo(youtubeChannelId, googleEmail);
            account.updateTokens(accessToken, refreshToken, tokenExpiresAt);
            return accountRepository.save(account);
        }

        YouTubeAccount newAccount = YouTubeAccount.builder()
                .member(member)
                .youtubeChannelId(youtubeChannelId)
                .googleEmail(googleEmail)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenExpiresAt(tokenExpiresAt)
                .syncStatus(SyncStatus.PENDING)
                .syncEnabled(true)
                .build();

        return accountRepository.save(newAccount);
    }

    public void deleteStalePlaylists(YouTubeAccount account, Set<String> latestPlaylistIds) {
        List<YouTubePlaylist> existing = playlistRepository.findByAccountId(account.getId());
        for (YouTubePlaylist playlist : existing) {
            if (!latestPlaylistIds.contains(playlist.getYoutubePlaylistId())) {
                playlistVideoRepository.deleteByPlaylistId(playlist.getId());
                playlistRepository.deleteById(playlist.getId());
            }
        }
    }

    public YouTubePlaylist upsertPlaylist(YouTubeAccount account, String youtubePlaylistId, String title, PrivacyStatus privacyStatus, LocalDateTime collectedAt) {
        Optional<YouTubePlaylist> existing = playlistRepository.findByYoutubePlaylistId(youtubePlaylistId);
        YouTubePlaylist playlist = existing.orElseGet(() -> YouTubePlaylist.builder()
                .account(account)
                .youtubePlaylistId(youtubePlaylistId)
                .build());

        playlist = YouTubePlaylist.builder()
                .id(playlist.getId())
                .account(account)
                .youtubePlaylistId(youtubePlaylistId)
                .title(title)
                .privacyStatus(privacyStatus)
                .collectedAt(collectedAt)
                .build();

        return playlistRepository.save(playlist);
    }

    public YouTubeVideo upsertVideo(String youtubeVideoId, String title, String channelTitle, String categoryId) {
        Optional<YouTubeVideo> existing = videoRepository.findByYoutubeVideoId(youtubeVideoId);
        YouTubeVideo video = existing.orElseGet(() -> YouTubeVideo.builder()
                .youtubeVideoId(youtubeVideoId)
                .build());

        video = YouTubeVideo.builder()
                .id(video.getId())
                .youtubeVideoId(youtubeVideoId)
                .title(title)
                .channelTitle(channelTitle)
                .categoryId(categoryId)
                .build();

        return videoRepository.save(video);
    }

    public void replacePlaylistVideos(YouTubePlaylist playlist, List<PlaylistVideoInput> items, LocalDateTime collectedAt) {
        playlistVideoRepository.deleteByPlaylistId(playlist.getId());
        if (items == null || items.isEmpty()) {
            return;
        }
        List<YouTubePlaylistVideo> batch = new ArrayList<>();
        for (PlaylistVideoInput item : items) {
            YouTubePlaylistVideo pv = YouTubePlaylistVideo.builder()
                    .playlist(playlist)
                    .video(item.video())
                    .position(item.position())
                    .collectedAt(collectedAt)
                    .build();
            batch.add(pv);
        }
        playlistVideoRepository.saveAll(batch);
    }

    public void replaceLikedVideos(YouTubeAccount account, List<YouTubeVideo> videos, LocalDateTime collectedAt) {
        likedVideoRepository.deleteByAccountId(account.getId());
        if (videos == null || videos.isEmpty()) {
            return;
        }
        List<YouTubeLikedVideo> batch = new ArrayList<>();
        for (YouTubeVideo video : videos) {
            YouTubeLikedVideo lv = YouTubeLikedVideo.builder()
                    .account(account)
                    .video(video)
                    .likedAt(null)
                    .collectedAt(collectedAt)
                    .build();
            batch.add(lv);
        }
        likedVideoRepository.saveAll(batch);
    }

    public void replaceSubscriptions(YouTubeAccount account, List<SubscriptionInput> inputs, LocalDateTime collectedAt) {
        subscriptionRepository.deleteByAccountId(account.getId());
        if (inputs == null || inputs.isEmpty()) {
            return;
        }
        List<YouTubeSubscription> batch = new ArrayList<>();
        for (SubscriptionInput input : inputs) {
            YouTubeSubscription sub = YouTubeSubscription.builder()
                    .account(account)
                    .youtubeChannelId(input.youtubeChannelId())
                    .title(input.title())
                    .description(input.description())
                    .subscribedAt(input.subscribedAt())
                    .collectedAt(collectedAt)
                    .build();
            batch.add(sub);
        }
        subscriptionRepository.saveAll(batch);
    }

    public void replaceVideoTags(YouTubeVideo video, List<String> tags) {
        videoTagRepository.deleteByVideoId(video.getId());
        if (tags == null || tags.isEmpty()) {
            return;
        }
        List<YouTubeVideoTag> batch = new ArrayList<>();
        java.util.LinkedHashMap<String, String> uniqueTags = new java.util.LinkedHashMap<>();
        for (String tag : tags) {
            if (tag == null) {
                continue;
            }
            String normalized = tag.trim();
            if (normalized.isEmpty()) {
                continue;
            }
            String key = normalized.toLowerCase(java.util.Locale.ROOT);
            uniqueTags.putIfAbsent(key, normalized);
        }
        for (String tag : uniqueTags.values()) {
            YouTubeVideoTag t = YouTubeVideoTag.builder()
                    .video(video)
                    .tagName(tag)
                    .build();
            batch.add(t);
        }
        if (!batch.isEmpty()) {
            videoTagRepository.saveAll(batch);
        }
    }

    public void replaceSnapshot(YouTubeAccount account, SnapshotType type, String rawJson, LocalDateTime collectedAt) {
        snapshotRepository.deleteByAccountIdAndSnapshotType(account.getId(), type);
        YouTubeSyncSnapshot snapshot = YouTubeSyncSnapshot.builder()
                .account(account)
                .snapshotType(type)
                .rawJson(rawJson)
                .collectedAt(collectedAt)
                .build();
        snapshotRepository.save(snapshot);
    }

    public void updateSyncStatus(YouTubeAccount account, SyncStatus status, LocalDateTime lastSyncedAt) {
        account.updateSyncStatus(status, lastSyncedAt);
        accountRepository.save(account);
    }

    public record PlaylistVideoInput(YouTubeVideo video, Integer position) {}
    public record SubscriptionInput(String youtubeChannelId, String title, String description, LocalDateTime subscribedAt) {}
}
