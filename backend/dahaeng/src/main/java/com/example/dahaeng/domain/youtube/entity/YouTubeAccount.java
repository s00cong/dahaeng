package com.example.dahaeng.domain.youtube.entity;

import com.example.dahaeng.global.entity.BaseEntity;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.youtube.enums.SyncStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "youtube_account")
public class YouTubeAccount extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false, unique = true)
    private Member member;

    @Column(name = "youtube_channel_id", length = 100, unique = true, nullable = true)
    private String youtubeChannelId;

    @Column(name = "google_email", length = 100)
    private String googleEmail;

    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;

    @Column(name = "token_expires_at")
    private LocalDateTime tokenExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status", nullable = false)
    private SyncStatus syncStatus;

    @Column(name = "sync_enabled")
    private Boolean syncEnabled;

    @Column(name = "sync_disabled_at")
    private LocalDateTime syncDisabledAt;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    public void updateTokens(String accessToken, String refreshToken, LocalDateTime expiresAt) {
        this.accessToken = accessToken;
        if (refreshToken != null && !refreshToken.isBlank()) {
            this.refreshToken = refreshToken;
        }
        this.tokenExpiresAt = expiresAt;
    }

    public void updateChannelInfo(String youtubeChannelId, String googleEmail) {
        if (youtubeChannelId != null && !youtubeChannelId.isBlank()) {
            this.youtubeChannelId = youtubeChannelId;
        }
        if (googleEmail != null && !googleEmail.isBlank()) {
            this.googleEmail = googleEmail;
        }
    }

    public void updateSyncStatus(SyncStatus status, LocalDateTime syncedAt) {
        this.syncStatus = status;
        if (status == SyncStatus.SYNCED) {
            this.lastSyncedAt = syncedAt;
        }
    }

    public void updateSyncPreference(boolean enabled, LocalDateTime changedAt) {
        this.syncEnabled = enabled;
        this.syncDisabledAt = enabled ? null : changedAt;
    }

    public boolean isSyncEnabledEffective() {
        return this.syncEnabled == null || this.syncEnabled;
    }
}
