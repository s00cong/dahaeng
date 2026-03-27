package com.example.dahaeng.domain.youtube.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubeAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface YouTubeAccountRepository extends JpaRepository<YouTubeAccount, Long> {
    Optional<YouTubeAccount> findByMemberId(Long memberId);
}