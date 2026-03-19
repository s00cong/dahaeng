package com.example.dahaeng.domain.internalimage.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.dahaeng.domain.internalimage.dto.InternalImageUploadResponse;
import com.example.dahaeng.domain.internalimage.service.InternalImageUploadService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/internal/image")
public class InternalImageUploadController {

    private final InternalImageUploadService internalImageUploadService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<InternalImageUploadResponse>> upload(
            @RequestPart("files") List<MultipartFile> files
    ) {
        return ResponseEntity.ok(internalImageUploadService.upload(files));
    }
}

