package com.example.dahaeng.domain.place.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dahaeng.domain.member.entity.Member;
import com.example.dahaeng.domain.member.entity.MemberTag;
import com.example.dahaeng.domain.member.repository.MemberRepository;
import com.example.dahaeng.domain.member.repository.MemberTagRepository;
import com.example.dahaeng.domain.place.dto.response.PlaceDetailResponse;
import com.example.dahaeng.domain.place.dto.response.PlaceListResponse;
import com.example.dahaeng.domain.place.dto.response.PlaceResponse;
import com.example.dahaeng.domain.place.dto.response.SpotTagResponse;
import com.example.dahaeng.domain.place.dto.util.PlaceTagDto;
import com.example.dahaeng.domain.place.entity.TouristSpot;
import com.example.dahaeng.domain.place.repository.SpotTagRepository;
import com.example.dahaeng.domain.place.repository.TouristSpotRepository;
import com.example.dahaeng.domain.recommend.repository.SpotTagScoreProjection;
import com.example.dahaeng.domain.tag.entity.Tag;
import com.example.dahaeng.domain.tag.repository.TagRepository;
import com.example.dahaeng.global.exception.CustomException;
import com.example.dahaeng.global.exception.ErrorCode;

import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class TouristService {

	private final MemberRepository memberRepository;
	private final MemberTagRepository memberTagRepository;
	private final TouristSpotRepository touristSpotRepository;
	private final SpotTagRepository spotTagRepository;
	private final TagRepository tagRepository;

	@Transactional
	public List<PlaceListResponse> places(Long cityId, Long memberId) {
		// 1. memberId 확인
		// 2. 분기 ( 추천, 비추천 )
		if (memberId != null) {
			return recommend(cityId, memberId);
		} else {
			return unrecommend(cityId);
		}
	}

	public PlaceDetailResponse detail(Long spotId) {
		List<SpotTagScoreProjection> tags = spotTagRepository.findTageScoresBySpotId(spotId);

		TouristSpot touristSpot = touristSpotRepository.findById(spotId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 관광지 아이디입니다."));

		tags.sort((o1, o2)
			-> Double.compare(o2.getScore(), o1.getScore()));

		List<SpotTagResponse> tagResList = tags.stream()
			.map((tag) -> new SpotTagResponse(tag.getTagName(), tag.getScore()))
			.toList();

		return PlaceDetailResponse.from(touristSpot, tagResList);
	}

	private List<PlaceListResponse> recommend(Long cityId, Long memberId) {
		Member member = validMember(memberId);

		List<MemberTag> memberTags = memberTagRepository.findAllByMember(member);
		if (memberTags.isEmpty()) {
			return unrecommend(cityId);
		}

		List<TouristSpot> places = touristSpotRepository.findByCityId(cityId);
		if (places.isEmpty()) {
			return List.of();
		}

		List<String> selectedTags = memberTags.stream()
			.map(tag -> tag.getTag().getName())
			.toList();
		if (selectedTags.isEmpty()) {
			return unrecommend(cityId);
		}

		List<Long> placeIds = places.stream()
			.map(TouristSpot::getId)
			.toList();
		if (placeIds.isEmpty()) {
			return List.of();
		}

		Map<Long, List<SpotTagScoreProjection>> spotMap = new HashMap<>();

		spotTagRepository
			.findTagScoresBySpotIds(placeIds, selectedTags)
			.forEach((tag) -> {
				List<SpotTagScoreProjection> list =
					spotMap.getOrDefault(tag.getSpotId(), new ArrayList<>());
				list.add(tag);
				spotMap.put(tag.getSpotId(), list);
			});

		return getPlaceResponses(places, spotMap);
	}

	private List<PlaceListResponse> unrecommend(Long cityId) {
		log.info("unrecommended={}", cityId);
		List<TouristSpot> places = touristSpotRepository.findByCityId(cityId);
		if (places.isEmpty()) {
			return List.of();
		}

		List<Long> placeIds = places.stream()
			.map(TouristSpot::getId)
			.toList();
		if (placeIds.isEmpty()) {
			return List.of();
		}

		List<String> tagNames = tagRepository.findAll()
			.stream()
			.map(Tag::getName)
			.toList();
		if (tagNames.isEmpty()) {
			return List.of();
		}

		Map<Long, List<SpotTagScoreProjection>> tagMap = new HashMap<>();

		spotTagRepository.findTagScoresBySpotIds(placeIds, tagNames)
			.forEach(projection ->
				{
					List<SpotTagScoreProjection> list =
						tagMap.getOrDefault(projection.getSpotId(), new ArrayList<>());
					list.add(projection);
					tagMap.put(projection.getSpotId(), list);
				}
			);

		return getPlaceResponses(places, tagMap);
	}

	private Member validMember(Long memberId) {
		return memberRepository
			.findById(memberId)
			.orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 멤버아이디입니다."));
	}

	private @NonNull List<PlaceListResponse> getPlaceResponses(
		List<TouristSpot> places,
		Map<Long, List<SpotTagScoreProjection>> spotMap
	) {
		PriorityQueue<PlaceTagDto> pq = new PriorityQueue<>((o1, o2) -> {
			double o1Score = 0, o2Score = 0;

			if (o1.tags() != null) {
				o1Score = o1.tags()
					.stream()
					.mapToDouble(SpotTagScoreProjection::getScore)
					.average()
					.orElse(0);
			}

			if (o2.tags() != null) {
				o2Score = o2.tags()
					.stream()
					.mapToDouble(SpotTagScoreProjection::getScore)
					.average()
					.orElse(0);
			}

			return Double.compare(o2Score, o1Score);
		});

		places.forEach(place -> {
			if (spotMap.get(place.getId()) != null) {
				pq.add(new PlaceTagDto(place, spotMap.get(place.getId())));
			}
		});

		List<PlaceListResponse> res = new ArrayList<>();

		int cnt = 0;
		for (PlaceTagDto placeTagDto : pq) {
			if (cnt == 10) {
				break;
			}
			res.add(PlaceListResponse.from(
				placeTagDto.place(),
				placeTagDto.tags().stream()
					.map(tag -> new SpotTagResponse(tag.getTagName(), tag.getScore()))
					.toList()
			));
			cnt++;
		}

		return res;
	}
}
