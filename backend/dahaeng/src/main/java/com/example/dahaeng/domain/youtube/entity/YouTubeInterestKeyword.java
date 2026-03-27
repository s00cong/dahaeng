package com.example.dahaeng.domain.youtube.entity;

import com.example.dahaeng.global.entity.BaseEntity;
import com.example.dahaeng.domain.youtube.enums.SourceType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "youtube_interest_keyword")
public class YouTubeInterestKeyword extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private YouTubeAccount account;

    @Column(name = "keyword", length = 100, nullable = false)
    private String keyword;

    @Column(name = "normalized_keyword", length = 100)
    private String normalizedKeyword;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private SourceType sourceType;

    @Column(name = "score", nullable = false)
    private Double score;

    @Column(name = "analyzed_at", nullable = false)
    private LocalDateTime analyzedAt;
}