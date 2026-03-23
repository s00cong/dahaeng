package com.example.dahaeng.domain.bookmark.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.global.entity.BaseEntity;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "bookmark")
public class Bookmark extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "member_id", nullable = false)
	private Member member;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "city_id", nullable = false)
	private City city;

	private String title;

	@Column(columnDefinition = "TEXT")
	private String json;

	@Column(name = "recommend_id")
	private UUID recommendId;

	public void delete() {
		if (isDeleted()) {
			throw new CustomException(ErrorCode.INVALID_REQUEST, "이미 삭제된 북마크입니다.");
		}
		super.delete();
	}

	public void createdAt(LocalDateTime createdAt) {
		setCreatedAt(createdAt);
	}

	@Override
	protected void setCreatedAt(LocalDateTime createdAt) {
		super.setCreatedAt(createdAt);
	}
}
