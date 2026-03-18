package com.example.dahaeng.domain.bookmark.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.bookmark.dto.request.BookMarkCreateRequest;
import com.example.dahaeng.domain.bookmark.dto.response.BookmarkDetailResponse;
import com.example.dahaeng.domain.bookmark.dto.response.BookmarkSummaryResponse;
import com.example.dahaeng.domain.bookmark.dto.response.BookmarkTop5Response;
import com.example.dahaeng.domain.bookmark.dto.util.CityBookmarkCountDto;
import com.example.dahaeng.domain.bookmark.dto.util.CityLatestBookmarkDto;
import com.example.dahaeng.domain.bookmark.entity.Bookmark;
import com.example.dahaeng.domain.bookmark.repository.BookmarkRepository;
import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.city.repository.CityRepository;
import com.example.dahaeng.domain.exchange.dto.response.current.ExchangeRateResponse;
import com.example.dahaeng.domain.exchange.entity.Exchange;
import com.example.dahaeng.domain.exchange.repository.ExchangeRepository;
import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.global.dto.response.NoContentResponse;
import com.example.dahaeng.global.dto.response.PageResponse;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class BookmarkService {
	private final BookmarkRepository bookmarkRepository;
	private final MemberRepository memberRepository;
	private final ExchangeRepository exchangeRepository;
	private final CityRepository cityRepository;
	private final ObjectMapper mapper;

	@Transactional(readOnly = true)
	public BookmarkDetailResponse detail(Long bookmarkId, Long memberId) throws JsonProcessingException {
		Member member = validMember(memberId);

		Bookmark bookmark = bookmarkRepository
			.findFirstByIdAndMemberAndIsDeletedFalse(bookmarkId, member)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 북마크 아이디입니다."));

		Exchange exchange = exchangeRepository
			.findFirstByCurrencyOrderByEventDateDesc(bookmark.getCity().getCountry().getCurrency())
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 환율 아이디입니다."));

		return new BookmarkDetailResponse(
			bookmark.getId(),
			mapper.readTree(bookmark.getJson()),
			ExchangeRateResponse.from(exchange),
			bookmark.getCreatedAt()
		);
	}

	public NoContentResponse save(BookMarkCreateRequest request, Long memberId) throws JsonProcessingException {
		Member member = validMember(memberId);

		bookmarkRepository
			.findFirstByCityIdAndMemberAndIsDeletedFalseOrderByCreatedAtDesc(request.cityId(), member)
			.ifPresent((bookmark) -> {
				if (bookmark.getCreatedAt().toLocalDate().equals(LocalDate.now())) {
					throw new CustomException(ErrorCode.INVALID_REQUEST, "이미 생성된 북마크입니다.");
				}
			});

		City city = cityRepository.findById(request.cityId())
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 도시 아이디입니다."));

		Bookmark bookmark = Bookmark.builder()
			.member(member)
			.city(city)
			.json(mapper.writeValueAsString(request.json()))
			.build();

		return new NoContentResponse("북마크 생성 완료", bookmarkRepository.save(bookmark).getId());
	}

	@Transactional(readOnly = true)
	public PageResponse<BookmarkSummaryResponse> summaries(String keyword, Long memberId, Pageable pageable) {
		Member member = validMember(memberId);

		Page<Bookmark> bookmarks = bookmarkRepository.findAllByKeywordAndMember(keyword, member, pageable);

		return PageResponse.from(
			new PageImpl<>(bookmarks.stream()
				.map(BookmarkSummaryResponse::from)
				.toList(), pageable, bookmarks.getTotalElements())
		);
	}

	public NoContentResponse delete(Long id, Long memberId) {
		Member member = validMember(memberId);

		Bookmark bookmark = bookmarkRepository
			.findFirstByIdAndMemberAndIsDeletedFalse(id, member)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 북마크 아이디입니다."));

		bookmark.delete();

		return new NoContentResponse("북마크 삭제가 완료되었습니다.", bookmark.getId());
	}

	@Transactional(readOnly = true)
	public List<BookmarkTop5Response> top5(Long memberId) {
		validMember(memberId);

		List<CityBookmarkCountDto> topCityCounts = bookmarkRepository
			.findTopCityCounts(memberId, PageRequest.of(0, 5));

		if (topCityCounts.isEmpty()) {
			return List.of();
		}

		List<Long> cityIds = topCityCounts.stream()
			.map(CityBookmarkCountDto::cityId)
			.toList();

		Map<Long, CityLatestBookmarkDto> latestByCityId = bookmarkRepository
			.findLatestByMemberIdAndCityIds(memberId, cityIds)
			.stream()
			.collect(Collectors.toMap(CityLatestBookmarkDto::cityId, Function.identity()));

		return topCityCounts.stream()
			.map(cityCount -> {
				CityLatestBookmarkDto latest = latestByCityId.get(cityCount.cityId());
				if (latest == null) {
					throw new CustomException(ErrorCode.NOT_FOUND, "북마크한 도시를 찾지 못합니다.");
				}
				return new BookmarkTop5Response(
					latest.bookmarkId(),
					latest.cityId(),
					cityCount.count(),
					parseBookmarkJson(latest.json()),
					latest.createdAt()
				);
			})
			.toList();
	}

	private JsonNode parseBookmarkJson(String json) {
		try {
			return mapper.readTree(json);
		} catch (JsonProcessingException e) {
			throw new CustomException(ErrorCode.INTERNAL_ERROR, "북마크 JSON 파싱에 실패했습니다.", e.getMessage(), e);
		}
	}

	private Member validMember(Long memberId) {
		return memberRepository.findById(memberId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자 정보가 없습니다."));
	}
}
