package com.example.dahaeng.domain.youtube.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubePlaylist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface YouTubePlaylistRepository extends JpaRepository<YouTubePlaylist, Long> {
    List<YouTubePlaylist> findByAccountId(Long accountId);
    Optional<YouTubePlaylist> findByYoutubePlaylistId(String youtubePlaylistId);
    void deleteByAccountId(Long accountId);
}
