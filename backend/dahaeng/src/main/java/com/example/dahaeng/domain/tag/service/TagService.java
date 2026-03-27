package com.example.dahaeng.domain.tag.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.tag.dto.response.TagListResponse;
import com.example.dahaeng.domain.tag.repository.TagRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TagService {

	private final TagRepository tagRepository;

	public List<TagListResponse> tagList() {
		return tagRepository.findAll()
			.stream()
			.map(TagListResponse::from)
			.toList();
	}


}
