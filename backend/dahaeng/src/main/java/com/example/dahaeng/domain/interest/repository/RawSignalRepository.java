package com.example.dahaeng.domain.interest.repository;

import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public class RawSignalRepository {

    @PersistenceContext
    private EntityManager em;

    public static class RawResult {
        public String text;
        public LocalDateTime time;
        public RawResult(String text, LocalDateTime time) {
            this.text = text;
            this.time = time;
        }
    }

    public List<RawResult> findPlaylistTitles(Long accountId) {
        return em.createQuery(
                "select new com.example.dahaeng.domain.interest.repository.RawSignalRepository$RawResult(p.title, p.collectedAt) " +
                "from YouTubePlaylist p where p.account.id = :accountId",
                RawResult.class
        ).setParameter("accountId", accountId).getResultList();
    }

    public List<RawResult> findPlaylistVideoTitles(Long accountId) {
        return em.createQuery(
                "select new com.example.dahaeng.domain.interest.repository.RawSignalRepository$RawResult(v.title, pv.collectedAt) " +
                "from YouTubePlaylistVideo pv join pv.video v join pv.playlist p " +
                "where p.account.id = :accountId",
                RawResult.class
        ).setParameter("accountId", accountId).getResultList();
    }

    public List<RawResult> findPlaylistVideoTags(Long accountId) {
        return em.createQuery(
                "select new com.example.dahaeng.domain.interest.repository.RawSignalRepository$RawResult(t.tagName, pv.collectedAt) " +
                "from YouTubePlaylistVideo pv join pv.video v join YouTubeVideoTag t on t.video.id = v.id join pv.playlist p " +
                "where p.account.id = :accountId",
                RawResult.class
        ).setParameter("accountId", accountId).getResultList();
    }

    public List<RawResult> findLikedVideoTitles(Long accountId) {
        return em.createQuery(
                "select new com.example.dahaeng.domain.interest.repository.RawSignalRepository$RawResult(v.title, lv.collectedAt) " +
                "from YouTubeLikedVideo lv join lv.video v " +
                "where lv.account.id = :accountId",
                RawResult.class
        ).setParameter("accountId", accountId).getResultList();
    }

    public List<RawResult> findLikedVideoTags(Long accountId) {
        // YouTubeLikedVideo와 YouTubeVideoTag를 video_id 기준으로 조인
        return em.createQuery(
                "select new com.example.dahaeng.domain.interest.repository.RawSignalRepository$RawResult(t.tagName, lv.collectedAt) " +
                "from YouTubeVideoTag t join t.video v join YouTubeLikedVideo lv on lv.video.id = v.id " +
                "where lv.account.id = :accountId",
                RawResult.class
        ).setParameter("accountId", accountId).getResultList();
    }

    public List<RawResult> findSubscriptionTitles(Long accountId) {
        return em.createQuery(
                "select new com.example.dahaeng.domain.interest.repository.RawSignalRepository$RawResult(s.title, s.collectedAt) " +
                "from YouTubeSubscription s where s.account.id = :accountId",
                RawResult.class
        ).setParameter("accountId", accountId).getResultList();
    }
}
