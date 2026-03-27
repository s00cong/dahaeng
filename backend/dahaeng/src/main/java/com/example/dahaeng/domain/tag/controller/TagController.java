package com.example.dahaeng.domain.tag.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dahaeng.domain.tag.dto.response.TagListResponse;
import com.example.dahaeng.domain.tag.service.TagService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/tag")
public class TagController {

	private final TagService tagService;

	@GetMapping
	public ResponseEntity<List<TagListResponse>> list() {
		return ResponseEntity.ok(tagService.tagList());
	}
}
