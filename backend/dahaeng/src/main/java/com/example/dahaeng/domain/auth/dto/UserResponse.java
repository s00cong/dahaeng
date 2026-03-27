package com.example.dahaeng.domain.auth.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String role;
    private String nickname;
    private String profileImageUrl;
}
