package com.example.dahaeng.domain.member.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.member.dto.request.MemberTagCreateRequest;
import com.example.dahaeng.domain.member.dto.response.MemberTagListResponse;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.entity.MemberTag;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.domain.member.repository.MemberTagRepository;
import com.example.dahaeng.domain.tag.entity.Tag;
import com.example.dahaeng.domain.tag.repository.TagRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class MemberTagService {

	private final MemberTagRepository memberTagRepository;
	private final MemberRepository memberRepository;
	private final TagRepository tagRepository;

	public List<MemberTagListResponse> list(Long memberId) {
		Member member = validMember(memberId);

		return memberTagRepository.findAllByMember(member)
			.stream()
			.map(MemberTagListResponse::from)
			.toList();
	}

	public void save(MemberTagCreateRequest request, Long memberId) {
		Member member = validMember(memberId);

		HashSet<Long> tagIds = new HashSet<>(request.tagIds());

		if (tagIds.isEmpty()) {
			throw new CustomException(ErrorCode.INVALID_REQUEST, "1 개 이상의 태그 아이디가 필요합니다.");
		}

		List<Tag> tags = tagRepository.findAllByTagIds(tagIds);

		Map<Long, MemberTag> exists = memberTagRepository
			.findAllExists(tags, member)
			.stream()
			.collect(Collectors.toMap(
				(memberTag) -> memberTag.getTag().getId(),
				Function.identity(),
				this::selectPreferredTag
			));

		List<MemberTag> memberTags = tags.stream().map((tag) -> {
			MemberTag memberTag = exists.getOrDefault(
				tag.getId(),
				MemberTag.builder()
					.tag(tag)
					.member(member)
					.isFromYoutube(false)
					.build()
			);
			memberTag.setFromYoutube(false);
			memberTag.updateTime();
			return memberTag;
		}).toList();

		memberTagRepository.saveAll(memberTags);
	}

	public void delete(Long id, Long memberId) {
		Member member = validMember(memberId);

		MemberTag memberTag = memberTagRepository
			.findByIdAndMemberAndIsDeletedFalse(id, member)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "해당 태깅 기록을 찾을 수 없습니다."));

		memberTag.delete();
	}

	private Member validMember(Long memberId) {
		return memberRepository
			.findById(memberId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자 정보를 찾을 수 없습니다."));
	}

	private MemberTag selectPreferredTag(MemberTag left, MemberTag right) {
		if (!left.isFromYoutube() && right.isFromYoutube()) {
			return left;
		}
		if (left.isFromYoutube() && !right.isFromYoutube()) {
			return right;
		}

		if (left.getUpdatedAt() == null) {
			return right;
		}
		if (right.getUpdatedAt() == null) {
			return left;
		}
		return left.getUpdatedAt().isAfter(right.getUpdatedAt()) ? left : right;
	}
}
