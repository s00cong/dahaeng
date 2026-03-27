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
@Table(name = "youtube_playlist_video")
public class YouTubePlaylistVideo extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", nullable = false)
    private YouTubePlaylist playlist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private YouTubeVideo video;

    private Integer position;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;
}
