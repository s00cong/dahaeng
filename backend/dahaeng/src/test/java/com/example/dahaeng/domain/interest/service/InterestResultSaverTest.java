package com.example.dahaeng.domain.interest.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import com.example.dahaeng.domain.interest.repository.YoutubeInterestKeywordRepository;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.entity.MemberTag;
import com.example.dahaeng.domain.member.repository.MemberTagRepository;
import com.example.dahaeng.domain.tag.entity.Category;
import com.example.dahaeng.domain.tag.entity.Tag;
import com.example.dahaeng.domain.tag.repository.TagRepository;
import com.example.dahaeng.domain.youtube.entity.YouTubeAccount;
import com.example.dahaeng.domain.youtube.repository.YouTubeAccountRepository;
import com.example.dahaeng.domain.youtube.repository.YouTubeTravelTagRepository;

@ExtendWith(MockitoExtension.class)
class InterestResultSaverTest {

    @Mock
    private YouTubeAccountRepository accountRepository;

    @Mock
    private YoutubeInterestKeywordRepository keywordRepository;

    @Mock
    private YouTubeTravelTagRepository travelTagRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private MemberTagRepository memberTagRepository;

    @Mock
    private TravelTagEvidenceService travelTagEvidenceService;

    @InjectMocks
    private InterestResultSaver saver;

    @Test
    void saveTravelTags_excludesManualTagIdsWhenSyncingMemberTags() {
        Member member = Member.builder().id(100L).build();
        YouTubeAccount account = YouTubeAccount.builder().id(1L).member(member).build();
        Category category = Category.builder().id(5L).name("테마").build();

        Tag tagA = Tag.builder().id(11L).name("힐링").category(category).build();
        Tag tagB = Tag.builder().id(22L).name("미식").category(category).build();

        TravelTagScore scoreA = TravelTagScore.builder()
            .category("테마")
            .tag("힐링")
            .score(0.9)
            .confidence(0.8)
            .reason("A")
            .build();
        TravelTagScore scoreB = TravelTagScore.builder()
            .category("테마")
            .tag("미식")
            .score(0.7)
            .confidence(0.9)
            .reason("B")
            .build();

        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(tagRepository.findByCategoryNameAndTagName("테마", "힐링")).thenReturn(Optional.of(tagA));
        when(tagRepository.findByCategoryNameAndTagName("테마", "미식")).thenReturn(Optional.of(tagB));
        when(memberTagRepository.findManualTagIdsByMemberAndTagIds(any(), anySet())).thenReturn(List.of(11L));
        when(tagRepository.findAllByTagIds(anySet())).thenReturn(List.of(tagB));

        saver.saveTravelTags(1L, List.of(scoreA, scoreB));

        verify(memberTagRepository).deleteByMemberAndIsFromYoutubeTrue(member);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MemberTag>> captor = ArgumentCaptor.forClass(List.class);
        verify(memberTagRepository).saveAll(captor.capture());

        List<MemberTag> savedMemberTags = captor.getValue();
        assertThat(savedMemberTags).hasSize(1);
        assertThat(savedMemberTags.get(0).getTag().getId()).isEqualTo(22L);
        assertThat(savedMemberTags.get(0).isFromYoutube()).isTrue();
    }

    @Test
    void saveTravelTags_skipsSaveWhenAllTagIdsAreAlreadyManual() {
        Member member = Member.builder().id(100L).build();
        YouTubeAccount account = YouTubeAccount.builder().id(1L).member(member).build();
        Category category = Category.builder().id(5L).name("테마").build();
        Tag tagA = Tag.builder().id(11L).name("힐링").category(category).build();

        TravelTagScore scoreA = TravelTagScore.builder()
            .category("테마")
            .tag("힐링")
            .score(0.9)
            .confidence(0.8)
            .reason("A")
            .build();

        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(tagRepository.findByCategoryNameAndTagName("테마", "힐링")).thenReturn(Optional.of(tagA));
        when(memberTagRepository.findManualTagIdsByMemberAndTagIds(any(), anySet())).thenReturn(List.of(11L));

        saver.saveTravelTags(1L, List.of(scoreA));

        verify(memberTagRepository).deleteByMemberAndIsFromYoutubeTrue(member);
        verify(memberTagRepository, never()).saveAll(any());
    }
}

