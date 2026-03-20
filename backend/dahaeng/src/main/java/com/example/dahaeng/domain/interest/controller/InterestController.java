package com.example.dahaeng.domain.interest.controller;

import com.example.dahaeng.domain.auth.dto.CustomOAuth2User;
import com.example.dahaeng.domain.interest.dto.InterestTagResponse;
import com.example.dahaeng.domain.interest.service.InterestAnalysisService;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.domain.youtube.entity.YouTubeAccount;
import com.example.dahaeng.domain.youtube.enums.SyncStatus;
import com.example.dahaeng.domain.youtube.repository.YouTubeAccountRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/interest")
public class InterestController {

    private final InterestAnalysisService analysisService;
    private final MemberRepository memberRepository;
    private final YouTubeAccountRepository accountRepository;

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, String>> analyze(@AuthenticationPrincipal CustomOAuth2User principal) {
        YouTubeAccount account = getLoginUserYouTubeAccount(principal);
        if (!account.isSyncEnabledEffective()) {
            throw new CustomException(ErrorCode.OPERATION_NOT_ALLOWED, "YouTube sync is disabled by user preference.");
        }
        if (account.getSyncStatus() != SyncStatus.SYNCED) {
            throw new CustomException(ErrorCode.OPERATION_NOT_ALLOWED, "YouTube data is not synced yet.");
        }
        analysisService.analyze(account.getId());
        return ResponseEntity.ok(Map.of("message", "interest analysis completed"));
    }

    @GetMapping("/analyze")
    public ResponseEntity<List<InterestTagResponse>> getAnalyzeResult(@AuthenticationPrincipal CustomOAuth2User principal) {
        YouTubeAccount account = getLoginUserYouTubeAccount(principal);
        return ResponseEntity.ok(analysisService.getAnalyzedTags(account.getId()));
    }

    private YouTubeAccount getLoginUserYouTubeAccount(CustomOAuth2User principal) {
        if (principal == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED, "Authentication is required.");
        }

        Member member = memberRepository.findById(principal.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "User not found."));

        return accountRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED, "YouTube account is not linked."));
    }
}
