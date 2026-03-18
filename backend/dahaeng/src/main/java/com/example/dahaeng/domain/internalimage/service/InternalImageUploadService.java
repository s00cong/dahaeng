package com.example.dahaeng.domain.internalimage.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.domain.country.repository.CountryRepository;
import com.example.dahaeng.domain.internalimage.config.InternalImageUploadProperties;
import com.example.dahaeng.domain.internalimage.dto.InternalImageUploadResponse;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
@RequiredArgsConstructor
public class InternalImageUploadService {

    private static final Pattern FILE_NAME_PATTERN =
            Pattern.compile("^(city|country)_(\\d+)\\.(jpg|jpeg|png|webp)$", Pattern.CASE_INSENSITIVE);

    private final InternalImageUploadProperties properties;
    private final CityRepository cityRepository;
    private final CountryRepository countryRepository;
    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.region.static}")
    private String region;

    @Transactional
    public List<InternalImageUploadResponse> upload(List<MultipartFile> files) {
        validateApiEnabled();
        validateFiles(files);

        List<InternalImageUploadResponse> result = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                throw new CustomException(ErrorCode.INVALID_REQUEST, "빈 파일은 업로드할 수 없습니다.");
            }

            String fileName = file.getOriginalFilename();
            if (fileName == null || fileName.isBlank()) {
                throw new CustomException(ErrorCode.INVALID_FILE_TYPE, "파일명이 없습니다. city_1.jpg 형식으로 업로드해 주세요.");
            }

            ParsedTarget target = parseTarget(fileName);
            validateImageContentType(file, fileName);

            String s3Key = target.type + "/" + target.id + "/img." + target.extension;
            uploadToS3(file, s3Key, fileName);
            String imageUrl = buildImageUrl(s3Key);

            updateImageUrl(target.type, target.id, imageUrl);

            result.add(InternalImageUploadResponse.builder()
                    .fileName(fileName)
                    .targetType(target.type)
                    .targetId(target.id)
                    .s3Key(s3Key)
                    .imageUrl(imageUrl)
                    .message("업로드 완료")
                    .build());
        }

        return result;
    }

    private void validateApiEnabled() {
        if (!properties.isEnabled()) {
            throw new CustomException(ErrorCode.NOT_FOUND, "내부 이미지 업로드 API가 비활성화되어 있습니다.");
        }
    }

    private void validateFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST, "최소 1개의 파일이 필요합니다.");
        }
        if (files.size() > properties.getMaxFiles()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST,
                    "한 번에 업로드할 수 있는 최대 파일 수는 " + properties.getMaxFiles() + "개입니다.");
        }
    }

    private ParsedTarget parseTarget(String fileName) {
        Matcher matcher = FILE_NAME_PATTERN.matcher(fileName.trim());
        if (!matcher.matches()) {
            throw new CustomException(ErrorCode.INVALID_FILE_TYPE,
                    "파일명 형식이 올바르지 않습니다. city_1.jpg 또는 country_3.png 형식을 사용해 주세요: " + fileName);
        }

        String type = matcher.group(1).toLowerCase();
        Long id = Long.parseLong(matcher.group(2));
        String ext = matcher.group(3).toLowerCase();
        return new ParsedTarget(type, id, ext);
    }

    private void validateImageContentType(MultipartFile file, String fileName) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new CustomException(ErrorCode.INVALID_FILE_TYPE,
                    "이미지 파일만 업로드 가능합니다. 문제 파일: " + fileName);
        }
    }

    private void uploadToS3(MultipartFile file, String s3Key, String fileName) {
        if (bucket == null || bucket.isBlank()) {
            throw new CustomException(ErrorCode.FILE_UPLOAD_FAILED, "S3 버킷 설정이 비어 있습니다.");
        }

        try (InputStream inputStream = file.getInputStream()) {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(s3Key)
                    .contentType(file.getContentType())
                    .build();
            s3Client.putObject(request, RequestBody.fromInputStream(inputStream, file.getSize()));
        } catch (IOException | S3Exception e) {
            throw new CustomException(
                    ErrorCode.FILE_UPLOAD_FAILED,
                    "S3 업로드에 실패했습니다. 파일: " + fileName,
                    "S3 upload failed for key=" + s3Key + ", fileName=" + fileName + ", reason=" + e.getMessage()
            );
        }
    }

    private String buildImageUrl(String s3Key) {
        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + s3Key;
    }

    private void updateImageUrl(String type, Long id, String imageUrl) {
        if ("city".equals(type)) {
            City city = cityRepository.findById(id)
                    .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "해당 city를 찾을 수 없습니다. id=" + id));
            city.setImgUrl(imageUrl);
            return;
        }

        Country country = countryRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "해당 country를 찾을 수 없습니다. id=" + id));
        country.updateImgUrl(imageUrl);
    }

    private record ParsedTarget(String type, Long id, String extension) {
    }
}

