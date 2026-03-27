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
@Table(name = "youtube_liked_video")
public class YouTubeLikedVideo extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private YouTubeAccount account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private YouTubeVideo video;

    @Column(name = "liked_at")
    private LocalDateTime likedAt;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;
}
