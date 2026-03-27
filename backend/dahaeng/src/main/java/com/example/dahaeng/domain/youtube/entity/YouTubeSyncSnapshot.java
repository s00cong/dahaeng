package com.example.dahaeng.domain.youtube.entity;

import com.example.dahaeng.global.entity.BaseEntity;
import com.example.dahaeng.domain.youtube.enums.SnapshotType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "youtube_sync_snapshot")
public class YouTubeSyncSnapshot extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private YouTubeAccount account;

    @Enumerated(EnumType.STRING)
    @Column(name = "snapshot_type", nullable = false)
    private SnapshotType snapshotType;

    @Column(name = "raw_json", columnDefinition = "LONGTEXT")
    private String rawJson;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;
}
