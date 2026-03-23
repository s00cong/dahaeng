package com.example.dahaeng.domain.tag.dto.response;

import com.example.dahaeng.domain.tag.entity.Tag;

public record TagListResponse(
	Long tagId,
	Long categoryId,
	String tagName,
	String categoryName
) {
	public static TagListResponse from(Tag tag) {
		return new TagListResponse(
			tag.getId(),
			tag.getCategory().getId(),
			tag.getName(),
			tag.getCategory().getName()
		);
	}
}
