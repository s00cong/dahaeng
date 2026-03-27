package com.example.dahaeng.domain.youtube.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubeSyncSnapshot;
import com.example.dahaeng.domain.youtube.enums.SnapshotType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface YouTubeSyncSnapshotRepository extends JpaRepository<YouTubeSyncSnapshot, Long> {
    void deleteByAccountIdAndSnapshotType(Long accountId, SnapshotType snapshotType);
    void deleteByAccountId(Long accountId);
}
