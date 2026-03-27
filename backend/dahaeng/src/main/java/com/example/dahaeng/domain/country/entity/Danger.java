package com.example.dahaeng.domain.country.entity;

import com.example.dahaeng.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "danger")
public class Danger extends BaseEntity {

	@Id
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "country_id", nullable = false)
	private Country country;

	@Column(length = 10)
	private String attention;

	@Column(name = "attention_partial", length = 255)
	private String attentionPartial;

	@Column(name = "attention_note", length = 255)
	private String attentionNote;

	@Column(name = "ban_note", length = 255)
	private String banNote;

	@Column(name = "ban_yn_partial", length = 255)
	private String banYnPartial;

	@Column(name = "ban_yna", length = 255)
	private String banYna;

	@Column(length = 10)
	private String control;

	@Column(name = "control_partial", length = 255)
	private String controlPartial;

	@Column(name = "control_note", length = 255)
	private String controlNote;

	@Column(name = "country_name", length = 20)
	private String countryName;

	@Column(name = "country_en_name", length = 100)
	private String countryEnName;

	@Column(length = 10)
	private String limita;

	@Column(name = "limita_partial", length = 255)
	private String limitaPartial;

	@Column(name = "limita_note", length = 255)
	private String limitaNote;

	@Column(name = "evacuate_rcmnd_remark", length = 255)
	private String evacuateRcmndRemark;

	@Column(name = "evacuate_region_ty", length = 255)
	private String evacuateRegionTy;

	@Column(name = "forbidden_rcmnd_remark", length = 255)
	private String forbiddenRcmndRemark;

	@Column(name = "forbidden__region_ty", length = 255)
	private String forbiddenRegionTy;
}
