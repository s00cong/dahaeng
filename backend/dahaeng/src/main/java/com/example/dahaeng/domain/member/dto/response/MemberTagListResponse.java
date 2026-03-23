package com.example.dahaeng.domain.member.dto.response;

import com.example.dahaeng.domain.member.entity.MemberTag;

public record MemberTagListResponse(
	Long id,
	Long tagId,
	String tagName,
	boolean isFromYoutube
) {
	public static MemberTagListResponse from(MemberTag memberTag) {
		return new MemberTagListResponse(
			memberTag.getId(),
			memberTag.getTag().getId(),
			memberTag.getTag().getName(),
			memberTag.isFromYoutube()
		);
	}
}
