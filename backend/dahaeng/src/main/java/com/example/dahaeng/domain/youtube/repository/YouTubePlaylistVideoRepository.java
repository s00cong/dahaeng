package com.example.dahaeng.domain.youtube.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubePlaylistVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface YouTubePlaylistVideoRepository extends JpaRepository<YouTubePlaylistVideo, Long> {
    List<YouTubePlaylistVideo> findByPlaylistId(Long playlistId);
    void deleteByPlaylistId(Long playlistId);
    void deleteByPlaylistAccountId(Long accountId);
}
