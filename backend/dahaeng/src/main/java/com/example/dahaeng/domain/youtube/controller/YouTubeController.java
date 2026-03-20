package com.example.dahaeng.domain.youtube.controller;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.youtube.dto.YouTubePlaylistDto;
import com.example.dahaeng.domain.youtube.dto.YouTubeSubscriptionDto;
import com.example.dahaeng.domain.youtube.dto.YouTubeVideoDto;
import com.example.dahaeng.domain.youtube.dto.request.YouTubeSyncPreferenceRequest;
import com.example.dahaeng.domain.youtube.service.YouTubePreferenceService;
import com.example.dahaeng.domain.youtube.service.YouTubeQueryService;
import com.example.dahaeng.domain.youtube.service.YouTubeSyncService;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/youtube")
public class YouTubeController {

    private final YouTubeSyncService syncService;
    private final YouTubeQueryService queryService;
    private final YouTubePreferenceService preferenceService;

    @PostMapping("/sync")
    public ResponseEntity<?> sync(@AuthenticationPrincipal CustomOAuth2User principal) {
        if (principal == null) throw new CustomException(ErrorCode.LOGIN_REQUIRED);
        syncService.sync(principal);
        return ResponseEntity.ok(Map.of("message", "youtube sync completed"));
    }

    @GetMapping("/sync-status")
    public ResponseEntity<?> getSyncStatus(@AuthenticationPrincipal CustomOAuth2User principal) {
        if (principal == null) throw new CustomException(ErrorCode.LOGIN_REQUIRED);
        var status = queryService.getSyncStatus(principal.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("connected", status.connected());
        response.put("syncEnabled", status.syncEnabled());
        response.put("syncStatus", status.syncStatus() != null ? status.syncStatus() : "NOT_CONNECTED");
        response.put("effectiveStatus", resolveEffectiveStatus(status));
        response.put("lastSyncedAt", status.lastSyncedAt());

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/sync-preference")
    public ResponseEntity<?> updateSyncPreference(
            @AuthenticationPrincipal CustomOAuth2User principal,
            @RequestBody YouTubeSyncPreferenceRequest request
    ) {
        if (principal == null) throw new CustomException(ErrorCode.LOGIN_REQUIRED);
        if (request == null || request.syncEnabled() == null) {
            throw new CustomException(ErrorCode.INVALID_PARAMETER, "syncEnabled is required.");
        }

        boolean purgeData = Boolean.TRUE.equals(request.purgeData());
        preferenceService.updatePreference(principal, request.syncEnabled(), purgeData);
        var status = queryService.getSyncStatus(principal.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "youtube sync preference updated");
        response.put("connected", status.connected());
        response.put("syncEnabled", status.syncEnabled());
        response.put("syncStatus", status.syncStatus() != null ? status.syncStatus() : "NOT_CONNECTED");
        response.put("effectiveStatus", resolveEffectiveStatus(status));
        response.put("lastSyncedAt", status.lastSyncedAt());
        response.put("purgeDataApplied", Boolean.FALSE.equals(status.syncEnabled()) && purgeData);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/playlists")
    public ResponseEntity<?> getPlaylists(@AuthenticationPrincipal CustomOAuth2User principal) {
        if (principal == null) throw new CustomException(ErrorCode.LOGIN_REQUIRED);

        List<YouTubePlaylistDto> playlists = queryService.getPlaylists(principal.getId());
        return ResponseEntity.ok(Map.of("playlists", playlists));
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<?> getSubscriptions(@AuthenticationPrincipal CustomOAuth2User principal) {
        if (principal == null) throw new CustomException(ErrorCode.LOGIN_REQUIRED);

        List<YouTubeSubscriptionDto> subscriptions = queryService.getSubscriptions(principal.getId());
        return ResponseEntity.ok(Map.of("subscriptions", subscriptions));
    }

    @GetMapping("/liked-videos")
    public ResponseEntity<?> getLikedVideos(@AuthenticationPrincipal CustomOAuth2User principal) {
        if (principal == null) throw new CustomException(ErrorCode.LOGIN_REQUIRED);

        List<YouTubeVideoDto> videos = queryService.getLikedVideos(principal.getId());
        return ResponseEntity.ok(Map.of("likedVideos", videos));
    }

    private String resolveEffectiveStatus(YouTubeQueryService.SyncStatusResponse status) {
        if (!status.connected()) {
            return "NOT_CONNECTED";
        }
        if (Boolean.FALSE.equals(status.syncEnabled())) {
            return "DISABLED";
        }
        return status.syncStatus() != null ? status.syncStatus().name() : "NOT_CONNECTED";
    }
}
