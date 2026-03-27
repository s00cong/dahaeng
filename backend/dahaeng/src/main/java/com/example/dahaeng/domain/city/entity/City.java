package com.example.dahaeng.domain.city.entity;

import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "city")
public class City extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "country_id", nullable = false)
	private Country country;

	@Column(name = "city_name", length = 50)
	private String cityName;

	@Column(name = "img_url", columnDefinition = "TEXT")
	private String imgUrl;

	@Column(columnDefinition = "TEXT")
	private String description;

	private Double lat;
	private Double lon;

	private Double news_penalty_score;
}
