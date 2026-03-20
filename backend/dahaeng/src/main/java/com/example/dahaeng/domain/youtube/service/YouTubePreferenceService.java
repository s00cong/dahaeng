package com.example.dahaeng.domain.youtube.service;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.interest.repository.YoutubeInterestKeywordRepository;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.domain.member.repository.MemberTagRepository;
import com.example.dahaeng.domain.youtube.entity.YouTubeAccount;
import com.example.dahaeng.domain.youtube.repository.YouTubeAccountRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubeLikedVideoRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubePlaylistRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubePlaylistVideoRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubeSubscriptionRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubeSyncSnapshotRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubeTravelTagRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class YouTubePreferenceService {

    private final MemberRepository memberRepository;
    private final YouTubeAccountRepository accountRepository;
    private final YouTubeSyncSnapshotRepository snapshotRepository;
    private final YouTubeLikedVideoRepository likedVideoRepository;
    private final YouTubeSubscriptionRepository subscriptionRepository;
    private final YouTubePlaylistVideoRepository playlistVideoRepository;
    private final YouTubePlaylistRepository playlistRepository;
    private final YoutubeInterestKeywordRepository keywordRepository;
    private final YouTubeTravelTagRepository travelTagRepository;
    private final MemberTagRepository memberTagRepository;

    @Transactional
    public YouTubeAccount updatePreference(CustomOAuth2User principal, boolean syncEnabled, boolean purgeData) {
        if (principal == null) {
            throw new CustomException(ErrorCode.LOGIN_REQUIRED);
        }

        Member member = memberRepository.findById(principal.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "User not found."));

        YouTubeAccount account = accountRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED, "YouTube account is not linked."));

        account.updateSyncPreference(syncEnabled, LocalDateTime.now());
        accountRepository.save(account);

        if (!syncEnabled && purgeData) {
            purgeYoutubeData(member, account.getId());
        }

        return account;
    }

    private void purgeYoutubeData(Member member, Long accountId) {
        snapshotRepository.deleteByAccountId(accountId);
        likedVideoRepository.deleteByAccountId(accountId);
        subscriptionRepository.deleteByAccountId(accountId);
        playlistVideoRepository.deleteByPlaylistAccountId(accountId);
        playlistRepository.deleteByAccountId(accountId);

        keywordRepository.deleteByAccount_Id(accountId);
        travelTagRepository.deleteByAccount_Id(accountId);
        memberTagRepository.deleteByMemberAndIsFromYoutubeTrue(member);
    }
}
