package com.example.dahaeng.domain.auth.dto;

import com.example.dahaeng.domain.member.dto.MemberDto;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CustomOAuth2User implements OAuth2User {

    private MemberDto memberDto;
    private Map<String, Object> attributes;

    @Override
    public Map<String, Object> getAttributes() {
        return attributes == null ? Map.of() : attributes;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(memberDto.getRole()));
    }

    @Override
    public String getName() {
        return memberDto.getSocialId();
    }

    public Long getId() {
        return memberDto.getId();
    }

    public String getEmail() {
        return memberDto.getEmail();
    }

    public String getNickname() {
        return memberDto.getNickname();
    }

    public String getProfileImageUrl() {
        return memberDto.getProfileImageUrl();
    }

    public String getRole() {
        return memberDto.getRole();
    }
}
