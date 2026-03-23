package com.example.dahaeng.domain.bookmark.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.dahaeng.domain.bookmark.dto.response.BookmarkTop5Response;
import com.example.dahaeng.domain.bookmark.entity.Bookmark;
import com.example.dahaeng.domain.bookmark.dto.util.CityBookmarkCountDto;
import com.example.dahaeng.domain.bookmark.dto.util.CityLatestBookmarkDto;
import com.example.dahaeng.domain.bookmark.repository.BookmarkRepository;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.flightalert.service.FlightAlertSubscriptionService;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class BookmarkServiceTest {

	@Mock
	private BookmarkRepository bookmarkRepository;

	@Mock
	private MemberRepository memberRepository;

	@Mock
	private ExchangeRepository exchangeRepository;

	@Mock
	private CityRepository cityRepository;

	@Mock
	private FlightAlertSubscriptionService flightAlertSubscriptionService;

	@InjectMocks
	private BookmarkService bookmarkService;

	@Test
	void deleteDisablesFlightAlertWhenLastBookmarkIsRemoved() {
		Member member = Member.builder()
			.id(1L)
			.email("test@example.com")
			.nickname("tester")
			.role("ROLE_USER")
			.socialId("social-id")
			.build();
		City city = City.builder().id(10L).cityName("도쿄").build();
		Bookmark bookmark = Bookmark.builder()
			.id(100L)
			.member(member)
			.city(city)
			.json("{}")
			.build();

		when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
		when(bookmarkRepository.findFirstByIdAndMemberAndIsDeletedFalse(100L, member))
			.thenReturn(Optional.of(bookmark));
		bookmarkService.delete(100L, 1L);

		verify(flightAlertSubscriptionService).disableWhenNoBookmarksRemain(1L, 10L);
	}
}
