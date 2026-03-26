package com.example.dahaeng.domain.bookmark.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.dahaeng.domain.bookmark.entity.Bookmark;
import com.example.dahaeng.domain.bookmark.repository.BookmarkRepository;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
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

	@InjectMocks
	private BookmarkService bookmarkService;

	@Test
	void deleteDoesNotTouchFlightAlertSubscription() {
		Member member = Member.builder()
			.id(1L)
			.email("test@example.com")
			.nickname("tester")
			.role("ROLE_USER")
			.socialId("social-id")
			.emailAlertEnabled(true)
			.build();
		City city = City.builder().id(10L).cityName("Tokyo").build();
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

		assertThat(bookmark.isDeleted()).isTrue();
	}
}
