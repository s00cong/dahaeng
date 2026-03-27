package com.example.dahaeng.domain.youtube.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubeVideoTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface YouTubeVideoTagRepository extends JpaRepository<YouTubeVideoTag, Long> {
    @Query("select t.tagName from YouTubeVideoTag t where t.video.id = :videoId")
    List<String> findTagNamesByVideoId(@Param("videoId") Long videoId);

    void deleteByVideoId(Long videoId);
}