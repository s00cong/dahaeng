package com.example.dahaeng.domain.flightalert.entity;

import java.time.LocalDateTime;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
	name = "flight_alert_subscription",
	uniqueConstraints = {
		@UniqueConstraint(name = "uk_flight_alert_subscription_member_city", columnNames = {"member_id", "city_id"})
	}
)
public class FlightAlertSubscription extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "member_id", nullable = false)
	private Member member;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "city_id", nullable = false)
	private City city;

	@Column(name = "threshold_price", nullable = false)
	private Integer thresholdPrice;

	@Builder.Default
	@Column(nullable = false)
	private boolean enabled = true;

	@Column(name = "last_notified_price")
	private Integer lastNotifiedPrice;

	@Column(name = "last_notified_at")
	private LocalDateTime lastNotifiedAt;

	public void updateThresholdPrice(Integer thresholdPrice) {
		this.thresholdPrice = thresholdPrice;
		this.enabled = true;
		this.lastNotifiedPrice = null;
		this.lastNotifiedAt = null;
	}

	public void disable() {
		this.enabled = false;
	}

	public void enable() {
		this.enabled = true;
	}

	public void updateLastNotification(Integer matchedPrice, LocalDateTime notifiedAt) {
		this.lastNotifiedPrice = matchedPrice;
		this.lastNotifiedAt = notifiedAt;
	}
}
