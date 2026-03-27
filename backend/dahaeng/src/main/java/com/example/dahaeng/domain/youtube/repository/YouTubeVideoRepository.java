package com.example.dahaeng.domain.youtube.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubeVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface YouTubeVideoRepository extends JpaRepository<YouTubeVideo, Long> {
    Optional<YouTubeVideo> findByYoutubeVideoId(String youtubeVideoId);
}