package com.example.dahaeng.domain.internalimage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.internal-image-upload")
public class InternalImageUploadProperties {
    private boolean enabled = false;
    private int maxFiles = 5;
}

