package com.example.dahaeng.domain.member.dto.request;

import java.util.List;

public record MemberTagCreateRequest(
	List<Long> tagIds
) {
}

