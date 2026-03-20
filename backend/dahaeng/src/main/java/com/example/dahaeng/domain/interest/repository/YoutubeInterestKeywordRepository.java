package com.example.dahaeng.domain.interest.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubeInterestKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

public interface YoutubeInterestKeywordRepository extends JpaRepository<YouTubeInterestKeyword, Long> {
    void deleteByAccount_Id(Long accountId);
    java.util.List<YouTubeInterestKeyword> findTop60ByAccount_IdOrderByScoreDesc(Long accountId);
}
