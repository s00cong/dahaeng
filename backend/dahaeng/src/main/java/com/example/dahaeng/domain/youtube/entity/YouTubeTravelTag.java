package com.example.dahaeng.domain.youtube.entity;

import com.example.dahaeng.domain.tag.entity.Tag;
import com.example.dahaeng.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "youtube_travel_tag")
public class YouTubeTravelTag extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private YouTubeAccount account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id")
    private Tag tag;

    @Column(name = "tag_name", length = 50, nullable = false)
    private String tagName;

    @Column(name = "category_name", length = 50, nullable = false)
    private String categoryName;

    @Column(name = "score", nullable = false)
    private Double score;

    @Column(name = "confidence", nullable = false)
    private Double confidence;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "evidence_keywords_json", columnDefinition = "TEXT")
    private String evidenceKeywordsJson;

    @Column(name = "source_badges_json", columnDefinition = "TEXT")
    private String sourceBadgesJson;

    @Column(name = "analyzed_at", nullable = false)
    private LocalDateTime analyzedAt;
}
