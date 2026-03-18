package com.example.dahaeng.domain.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
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

import com.example.dahaeng.domain.member.dto.request.MemberTagCreateRequest;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.entity.MemberTag;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.domain.member.repository.MemberTagRepository;
import com.example.dahaeng.domain.tag.entity.Tag;
import com.example.dahaeng.domain.tag.repository.TagRepository;

@ExtendWith(MockitoExtension.class)
class MemberTagServiceTest {

    @Mock
    private MemberTagRepository memberTagRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private TagRepository tagRepository;

    @InjectMocks
    private MemberTagService memberTagService;

    @Test
    void save_mergesDuplicateExistingTagsAndStoresAsManualTag() {
        Member member = Member.builder().id(1L).build();
        Tag tag = Tag.builder().id(10L).name("맛집").build();

        MemberTag fromYoutube = MemberTag.builder()
            .member(member)
            .tag(tag)
            .isFromYoutube(true)
            .build();
        fromYoutube.updateTime();

        MemberTag manual = MemberTag.builder()
            .member(member)
            .tag(tag)
            .isFromYoutube(false)
            .build();
        manual.updateTime();

        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(tagRepository.findAllByTagIds(any())).thenReturn(List.of(tag));
        when(memberTagRepository.findAllExists(any(), any())).thenReturn(List.of(fromYoutube, manual));

        MemberTagCreateRequest request = new MemberTagCreateRequest(List.of(10L));

        assertThatCode(() -> memberTagService.save(request, 1L))
            .doesNotThrowAnyException();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MemberTag>> captor = ArgumentCaptor.forClass(List.class);
        verify(memberTagRepository).saveAll(captor.capture());

        List<MemberTag> saved = captor.getValue();
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).isFromYoutube()).isFalse();
        assertThat(saved.get(0).getTag().getId()).isEqualTo(10L);
    }
}

