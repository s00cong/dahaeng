package com.example.dahaeng.domain.youtube.entity;

import com.example.dahaeng.global.entity.BaseEntity;
import com.example.dahaeng.domain.youtube.enums.PrivacyStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "youtube_playlist")
public class YouTubePlaylist extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private YouTubeAccount account;

    @Column(name = "youtube_playlist_id", length = 100, nullable = false, unique = true)
    private String youtubePlaylistId;

    @Column(name = "title", length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy_status", nullable = false)
    private PrivacyStatus privacyStatus;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;
}