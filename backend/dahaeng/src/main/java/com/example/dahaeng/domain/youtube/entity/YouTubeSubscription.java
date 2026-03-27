package com.example.dahaeng.domain.youtube.entity;

import com.example.dahaeng.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "youtube_subscription")
public class YouTubeSubscription extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private YouTubeAccount account;

    @Column(name = "youtube_channel_id", length = 100, nullable = false)
    private String youtubeChannelId;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "subscribed_at")
    private LocalDateTime subscribedAt;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;
}
