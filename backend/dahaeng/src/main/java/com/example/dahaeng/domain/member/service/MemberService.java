package com.example.dahaeng.domain.member.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.auth.dto.UserResponse;
import com.example.dahaeng.domain.member.dto.request.UpdateAlertSettingsRequest;
import com.example.dahaeng.domain.member.dto.response.AlertSettingsResponse;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

	private final MemberRepository memberRepository;

	public UserResponse getMemberResponse(Long memberId) {
		Member member = findMember(memberId);

		return UserResponse.builder()
			.id(member.getId())
			.role(member.getRole())
			.nickname(member.getNickname())
			.profileImageUrl(member.getProfileImageUrl())
			.build();
	}

	public AlertSettingsResponse getAlertSettings(Long memberId) {
		return AlertSettingsResponse.from(findMember(memberId));
	}

	@Transactional
	public AlertSettingsResponse updateAlertSettings(Long memberId, UpdateAlertSettingsRequest request) {
		Member member = findMember(memberId);
		member.updateEmailAlertEnabled(request.emailAlertEnabled());
		return AlertSettingsResponse.from(member);
	}

	@Transactional
	public void withdraw(Long memberId) {
		Member member = findMember(memberId);

		if (member.getDeletedAt() != null) {
			throw new CustomException(ErrorCode.INVALID_REQUEST, "이미 탈퇴한 회원입니다.");
		}

		member.withdraw();
	}

	private Member findMember(Long memberId) {
		return memberRepository.findById(memberId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));
	}
}
