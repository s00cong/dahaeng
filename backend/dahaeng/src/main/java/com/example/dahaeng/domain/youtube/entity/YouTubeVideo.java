package com.example.dahaeng.domain.youtube.entity;

import com.example.dahaeng.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "youtube_video")
public class YouTubeVideo extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "youtube_video_id", length = 50, nullable = false, unique = true)
    private String youtubeVideoId;

    @Column(length = 255)
    private String title;

    @Column(name = "channel_title", length = 100)
    private String channelTitle;

    @Column(name = "category_id", length = 20)
    private String categoryId;
}
