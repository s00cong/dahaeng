package com.example.dahaeng.domain.flightalert.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.bookmark.repository.BookmarkRepository;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.flightalert.dto.request.UpsertFlightAlertSubscriptionRequest;
import com.example.dahaeng.domain.flightalert.dto.response.FlightAlertSubscriptionResponse;
import com.example.dahaeng.domain.flightalert.entity.FlightAlertSubscription;
import com.example.dahaeng.domain.flightalert.repository.FlightAlertSubscriptionRepository;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.global.dto.response.NoContentResponse;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class FlightAlertSubscriptionService {
	private final FlightAlertSubscriptionRepository subscriptionRepository;
	private final MemberRepository memberRepository;
	private final CityRepository cityRepository;
	private final BookmarkRepository bookmarkRepository;

	@Transactional(readOnly = true)
	public List<FlightAlertSubscriptionResponse> getSubscriptions(Long memberId) {
		validMember(memberId);
		return subscriptionRepository.findAllByMemberIdAndIsDeletedFalse(memberId).stream()
			.map(FlightAlertSubscriptionResponse::from)
			.toList();
	}

	public FlightAlertSubscription upsert(Long memberId, Long cityId, UpsertFlightAlertSubscriptionRequest request) {
		Member member = validMember(memberId);
		City city = validCity(cityId);
		validateBookmarkExists(memberId, cityId);

		FlightAlertSubscription subscription = subscriptionRepository
			.findFirstByMemberIdAndCityIdAndIsDeletedFalse(memberId, cityId)
			.map(existing -> {
				existing.updateThresholdPrice(request.thresholdPrice());
				return existing;
			})
			.orElseGet(() -> FlightAlertSubscription.builder()
				.member(member)
				.city(city)
				.thresholdPrice(request.thresholdPrice())
				.enabled(true)
				.build());

		return subscriptionRepository.save(subscription);
	}

	public NoContentResponse disable(Long memberId, Long cityId) {
		validMember(memberId);
		FlightAlertSubscription subscription = subscriptionRepository
			.findFirstByMemberIdAndCityIdAndIsDeletedFalse(memberId, cityId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "항공권 알림 구독을 찾을 수 없습니다."));
		subscription.disable();
		return new NoContentResponse("항공권 알림이 해제되었습니다.", subscription.getId());
	}

	public void disableWhenNoBookmarksRemain(Long memberId, Long cityId) {
		if (bookmarkRepository.existsByMemberIdAndCityIdAndIsDeletedFalse(memberId, cityId)) {
			return;
		}
		subscriptionRepository.findFirstByMemberIdAndCityIdAndIsDeletedFalse(memberId, cityId)
			.ifPresent(FlightAlertSubscription::disable);
	}

	private void validateBookmarkExists(Long memberId, Long cityId) {
		if (!bookmarkRepository.existsByMemberIdAndCityIdAndIsDeletedFalse(memberId, cityId)) {
			throw new CustomException(ErrorCode.INVALID_REQUEST, "북마크한 도시만 항공권 알림을 설정할 수 있습니다.");
		}
	}

	private Member validMember(Long memberId) {
		return memberRepository.findById(memberId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));
	}

	private City validCity(Long cityId) {
		return cityRepository.findById(cityId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "도시를 찾을 수 없습니다."));
	}
}
