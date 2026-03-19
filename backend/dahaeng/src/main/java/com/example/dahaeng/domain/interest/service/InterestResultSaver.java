package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import com.example.dahaeng.domain.interest.enums.InterestSourceType;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.entity.MemberTag;
import com.example.dahaeng.domain.member.repository.MemberTagRepository;
import com.example.dahaeng.domain.tag.entity.Tag;
import com.example.dahaeng.domain.tag.repository.TagRepository;
import com.example.dahaeng.domain.interest.repository.YoutubeInterestKeywordRepository;
import com.example.dahaeng.domain.youtube.entity.YouTubeAccount;
import com.example.dahaeng.domain.youtube.entity.YouTubeInterestKeyword;
import com.example.dahaeng.domain.youtube.entity.YouTubeTravelTag;
import com.example.dahaeng.domain.youtube.enums.SourceType;
import com.example.dahaeng.domain.youtube.repository.YouTubeAccountRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubeTravelTagRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterestResultSaver {

    private static final int MAX_KEYWORDS_TO_SAVE = 200;

    private final YouTubeAccountRepository accountRepository;
    private final YoutubeInterestKeywordRepository keywordRepository;
    private final YouTubeTravelTagRepository travelTagRepository;
    private final TagRepository tagRepository;
    private final MemberTagRepository memberTagRepository;

    @Transactional
    public void save(Long accountId,
                     List<InterestKeywordCandidate> keywords,
                     List<TravelTagScore> travelTags) {
        saveKeywords(accountId, keywords);
        saveTravelTags(accountId, travelTags);
    }

    @Transactional
    public void saveKeywords(Long accountId, List<InterestKeywordCandidate> keywords) {
        YouTubeAccount account = getAccount(accountId);
        keywordRepository.deleteByAccount_Id(accountId);

        LocalDateTime now = LocalDateTime.now();

        if (keywords != null) {
            List<YouTubeInterestKeyword> keywordEntities = keywords.stream()
                    .limit(MAX_KEYWORDS_TO_SAVE)
                    .map(k -> YouTubeInterestKeyword.builder()
                            .account(account)
                            .keyword(k.getRawKeyword())
                            .normalizedKeyword(k.getNormalizedKeyword())
                            .sourceType(mapSourceType(k.getSourceType()))
                            .score(k.getScore())
                            .analyzedAt(now)
                            .build())
                    .toList();
            keywordRepository.saveAll(keywordEntities);
        }
    }

    @Transactional
    public void saveTravelTags(Long accountId, List<TravelTagScore> travelTags) {
        YouTubeAccount account = getAccount(accountId);
        travelTagRepository.deleteByAccount_Id(accountId);

        LocalDateTime now = LocalDateTime.now();

        if (travelTags != null && !travelTags.isEmpty()) {
            List<YouTubeTravelTag> tagEntities = travelTags.stream()
                    .map(t -> toYouTubeTravelTag(account, t, now))
                    .filter(java.util.Objects::nonNull)
                    .toList();
            travelTagRepository.saveAllAndFlush(tagEntities);
            syncMemberTagsFromYoutube(account.getMember(), tagEntities);
            System.out.println(">>> [DB SAVE SUCCESS] Saved " + tagEntities.size() + " travel tags for account " + accountId);
        } else {
            syncMemberTagsFromYoutube(account.getMember(), List.of());
            System.out.println(">>> [DB SAVE SKIP] No travel tags to save for account " + accountId);
        }
    }

    private YouTubeAccount getAccount(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "Linked account not found."));
    }

    private YouTubeTravelTag toYouTubeTravelTag(YouTubeAccount account, TravelTagScore tagScore, LocalDateTime now) {
        Tag tag = findTag(tagScore);
        return YouTubeTravelTag.builder()
                .account(account)
                .tag(tag)
                .tagName(resolveTagName(tagScore, tag))
                .categoryName(resolveCategoryName(tagScore, tag))
                .score(tagScore.getScore())
                .confidence(tagScore.getConfidence())
                .reason(tagScore.getReason())
                .analyzedAt(now)
                .build();
    }

    private Tag findTag(TravelTagScore tagScore) {
        if (tagScore.getCategory() == null || tagScore.getTag() == null) {
            log.warn(">>> [TAG MAP SKIP] Missing category/tag in AI result: {}", tagScore);
            return null;
        }

        return tagRepository.findByCategoryNameAndTagName(tagScore.getCategory().trim(), tagScore.getTag().trim())
                .orElseGet(() -> {
                    log.warn(">>> [TAG MAP MISS] No tag entity found for category='{}', tag='{}'.",
                            tagScore.getCategory(), tagScore.getTag());
                    return null;
                });
    }

    private String resolveCategoryName(TravelTagScore tagScore, Tag tag) {
        if (tag != null && tag.getCategory() != null) {
            return tag.getCategory().getName();
        }
        return tagScore.getCategory();
    }

    private String resolveTagName(TravelTagScore tagScore, Tag tag) {
        if (tag != null) {
            return tag.getName();
        }
        return tagScore.getTag();
    }

    private void syncMemberTagsFromYoutube(Member member, List<YouTubeTravelTag> youtubeTravelTags) {
        memberTagRepository.deleteByMemberAndIsFromYoutubeTrue(member);

        Set<Long> desiredTagIds = youtubeTravelTags.stream()
                .map(YouTubeTravelTag::getTag)
                .filter(java.util.Objects::nonNull)
                .map(Tag::getId)
                .collect(Collectors.toSet());

        if (desiredTagIds.isEmpty()) {
            return;
        }

        List<Long> manualTagIds = memberTagRepository.findManualTagIdsByMemberAndTagIds(member, desiredTagIds);
        desiredTagIds.removeAll(manualTagIds);

        if (desiredTagIds.isEmpty()) {
            return;
        }

        List<Tag> desiredTags = tagRepository.findAllByTagIds(desiredTagIds);
        List<MemberTag> memberTags = desiredTags.stream()
                .map(tag -> MemberTag.builder()
                        .member(member)
                        .tag(tag)
                        .isFromYoutube(true)
                        .build())
                .toList();

        memberTagRepository.saveAll(memberTags);
    }

    private SourceType mapSourceType(InterestSourceType type) {
        if (type == null) {
            return SourceType.PLAYLIST_TITLE;
        }

        return switch (type) {
            case PLAYLIST_TITLE -> SourceType.PLAYLIST_TITLE;
            case PLAYLIST_VIDEO_TITLE -> SourceType.PLAYLIST_VIDEO_TITLE;
            case PLAYLIST_VIDEO_TAG -> SourceType.PLAYLIST_VIDEO_TAG;
            case LIKED_VIDEO_TITLE -> SourceType.LIKED_VIDEO_TITLE;
            case LIKED_VIDEO_TAG -> SourceType.LIKED_VIDEO_TAG;
            case SUBSCRIPTION_TITLE -> SourceType.SUBSCRIPTION_TITLE;
            default -> SourceType.SUBSCRIPTION_TITLE;
        };
    }
}
