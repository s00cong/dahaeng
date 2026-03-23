package com.example.dahaeng.domain.youtube.service;

import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import com.example.dahaeng.domain.youtube.dto.YouTubePlaylistDto;
import com.example.dahaeng.domain.youtube.dto.YouTubeSubscriptionDto;
import com.example.dahaeng.domain.youtube.dto.YouTubeVideoDto;
import com.example.dahaeng.domain.youtube.entity.YouTubeAccount;
import com.example.dahaeng.domain.youtube.entity.YouTubePlaylist;
import com.example.dahaeng.domain.youtube.entity.YouTubePlaylistVideo;
import com.example.dahaeng.domain.youtube.entity.YouTubeVideoTag;
import com.example.dahaeng.domain.youtube.enums.SyncStatus;
import com.example.dahaeng.domain.youtube.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class YouTubeQueryService {

    private final YouTubeAccountRepository accountRepository;
    private final YouTubePlaylistRepository playlistRepository;
    private final YouTubePlaylistVideoRepository playlistVideoRepository;
    private final YouTubeSubscriptionRepository subscriptionRepository;
    private final YouTubeLikedVideoRepository likedVideoRepository;
    private final YouTubeVideoTagRepository videoTagRepository;

    public SyncStatusResponse getSyncStatus(Long memberId) {
        YouTubeAccount account = accountRepository.findByMemberId(memberId).orElse(null);
        if (account == null) {
            return new SyncStatusResponse(false, null, null, false);
        }
        return new SyncStatusResponse(true, account.getSyncStatus(), account.getLastSyncedAt(), account.isSyncEnabledEffective());
    }

    public List<YouTubePlaylistDto> getPlaylists(Long memberId) {
        YouTubeAccount account = accountRepository.findByMemberId(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "연동 계정을 찾을 수 없습니다."));

        List<YouTubePlaylist> playlists = playlistRepository.findByAccountId(account.getId());
        List<YouTubePlaylistDto> result = new ArrayList<>();
        for (YouTubePlaylist playlist : playlists) {
            List<YouTubePlaylistVideo> mappings = playlistVideoRepository.findByPlaylistId(playlist.getId());
            List<YouTubeVideoDto> videos = new ArrayList<>();
            for (YouTubePlaylistVideo pv : mappings) {
                List<String> tags = videoTagRepository.findTagNamesByVideoId(pv.getVideo().getId());
                videos.add(YouTubeVideoDto.builder()
                        .id(pv.getVideo().getYoutubeVideoId())
                        .title(pv.getVideo().getTitle())
                        .channelTitle(pv.getVideo().getChannelTitle())
                        .categoryId(pv.getVideo().getCategoryId())
                        .tags(tags)
                        .build());
            }
            result.add(YouTubePlaylistDto.builder()
                    .id(playlist.getYoutubePlaylistId())
                    .title(playlist.getTitle())
                    .videos(videos)
                    .build());
        }
        return result;
    }

    public List<YouTubeSubscriptionDto> getSubscriptions(Long memberId) {
        YouTubeAccount account = accountRepository.findByMemberId(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "연동 계정을 찾을 수 없습니다."));

        return subscriptionRepository.findByAccountId(account.getId()).stream()
                .map(sub -> YouTubeSubscriptionDto.builder()
                        .id(sub.getYoutubeChannelId())
                        .title(sub.getTitle())
                        .build())
                .toList();
    }

    public List<YouTubeVideoDto> getLikedVideos(Long memberId) {
        YouTubeAccount account = accountRepository.findByMemberId(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "연동 계정을 찾을 수 없습니다."));

        return likedVideoRepository.findByAccountId(account.getId()).stream()
                .map(lv -> {
                    List<String> tags = videoTagRepository.findTagNamesByVideoId(lv.getVideo().getId());
                    return YouTubeVideoDto.builder()
                            .id(lv.getVideo().getYoutubeVideoId())
                            .title(lv.getVideo().getTitle())
                            .channelTitle(lv.getVideo().getChannelTitle())
                            .categoryId(lv.getVideo().getCategoryId())
                            .tags(tags)
                            .build();
                })
                .toList();
    }

    public record SyncStatusResponse(boolean connected, SyncStatus syncStatus, LocalDateTime lastSyncedAt, Boolean syncEnabled) {}
}
