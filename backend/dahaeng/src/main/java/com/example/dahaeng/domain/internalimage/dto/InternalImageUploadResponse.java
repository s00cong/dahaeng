package com.example.dahaeng.domain.internalimage.dto;

import lombok.Builder;

@Builder
public record InternalImageUploadResponse(
        String fileName,
        String targetType,
        Long targetId,
        String s3Key,
        String imageUrl,
        String message
) {
}

