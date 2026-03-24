package com.example.dahaeng.domain.flightalert.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "flight_alert_notification")
public class FlightAlertNotification extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "subscription_id", nullable = false)
	private FlightAlertSubscription subscription;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "member_id", nullable = false)
	private Member member;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "city_id", nullable = false)
	private City city;

	@Enumerated(EnumType.STRING)
	@Column(name = "alert_type", nullable = false, length = 20)
	private AlertType alertType;

	@Column(name = "threshold_price", nullable = false)
	private Integer thresholdPrice;

	@Column(name = "matched_price", nullable = false)
	private Integer matchedPrice;

	@Column(name = "departure_date", nullable = false)
	private LocalDate departureDate;

	@Column(name = "return_date", nullable = false)
	private LocalDate returnDate;

	@Column(name = "collected_date", nullable = false)
	private LocalDate collectedDate;

	@Builder.Default
	@Column(name = "is_read", nullable = false)
	private boolean isRead = false;

	@Column(name = "read_at")
	private LocalDateTime readAt;

	public void markAsRead() {
		if (this.isRead) {
			return;
		}
		this.isRead = true;
		this.readAt = LocalDateTime.now();
	}
}
