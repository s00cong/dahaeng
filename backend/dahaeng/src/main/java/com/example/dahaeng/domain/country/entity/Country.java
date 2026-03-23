package com.example.dahaeng.domain.country.entity;

import com.example.dahaeng.domain.country.enums.Continent;
import com.example.dahaeng.domain.exchange.enums.Currency;
import com.example.dahaeng.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "country")
public class Country extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Currency currency;

	@Column(name = "country_name", length = 50)
	private String countryName;

	@Enumerated(EnumType.STRING)
	private Continent continent;

	@Column(name = "img_url", columnDefinition = "TEXT")
	private String imgUrl;

	private Double lat;
	private Double lon;

	public void updateImgUrl(String imgUrl) {
		this.imgUrl = imgUrl;
	}
}
