package com.example.dahaeng.domain.member.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberDto {
    private Long id;
    private String role;
    private String nickname;
    private String email;
    private String profileImageUrl;
    private String socialId;
}
