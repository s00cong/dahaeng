package com.example.dahaeng.domain.youtube.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubeLikedVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface YouTubeLikedVideoRepository extends JpaRepository<YouTubeLikedVideo, Long> {
    List<YouTubeLikedVideo> findByAccountId(Long accountId);
    void deleteByAccountId(Long accountId);
}