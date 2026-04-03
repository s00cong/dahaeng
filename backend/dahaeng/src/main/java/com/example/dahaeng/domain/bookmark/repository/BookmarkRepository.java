package com.example.dahaeng.domain.bookmark.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.dahaeng.domain.bookmark.dto.util.CityBookmarkCountDto;
import com.example.dahaeng.domain.bookmark.dto.util.CityLatestBookmarkDto;
import com.example.dahaeng.domain.bookmark.entity.Bookmark;
import com.example.dahaeng.domain.member.entity.Member;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
	Optional<Bookmark> findFirstByIdAndMemberAndIsDeletedFalse(Long id, Member member);

	@Query(value = """
		    select b
		    from Bookmark b
		    where (
				    :keyword is null or
					trim(:keyword) like '' or
					b.title like concat('%', :keyword, '%')	    
			)
			and	b.member = :member
		    and b.isDeleted = false
		""",
		countQuery = """
			    select count(b)
			    from Bookmark b
			    where (
				    :keyword is null or
					trim(:keyword) like '' or 
					b.title like concat('%', :keyword, '%')	    
			)
			and	b.member = :member
		    and b.isDeleted = false
			""")
	Page<Bookmark> findALlByKeywordAndMember(
		@Param("keyword") String keyword,
		@Param("member") Member member,
		Pageable pageable);


	@Query(
		"""
		select new com.example.dahaeng.domain.bookmark.dto.util.CityBookmarkCountDto(
			b.city.id,
			count(b.city.id)
		)
		from Bookmark b
		where b.member.id = :memberId
			and b.isDeleted = false
		group by b.city.id
		order by count(b.city.id) desc
		"""
	)
	List<CityBookmarkCountDto> findTopCityCounts(@Param("memberId") Long memberId, Pageable pageable);



	@Query(
		"""
		select new com.example.dahaeng.domain.bookmark.dto.util.CityLatestBookmarkDto(
			b.city.id,
			b.id,
			b.json,
			b.createdAt
		)
		from Bookmark b
		where b.member.id = :memberId
			and b.isDeleted = false
			and b.city.id in :cityIds
			and b.createdAt = (
				select max(b2.createdAt)
				from Bookmark b2
				where b2.member.id = :memberId
					and b2.isDeleted = false
					and b2.city.id = b.city.id
			)
			and b.id = (
				select max(b3.id)
				from Bookmark b3
				where b3.member.id = :memberId
					and b3.isDeleted = false
					and b3.city.id = b.city.id
					and b3.createdAt = b.createdAt
			)
		"""
	)
	List<CityLatestBookmarkDto> findLatestByMemberIdAndCityIds(
		@Param("memberId") Long memberId,
		@Param("cityIds") List<Long> cityIds
	);

	Optional<Bookmark> findFirstByCityIdAndMemberAndIsDeletedFalseOrderByCreatedAtDesc(
		@Param("cityId") Long cityId,
		@Param("member") Member member
	);

	Optional<Bookmark> findFirstByCityIdAndRecommendIdAndMemberAndIsDeletedFalse(
		@Param("cityId") Long cityId,
		@Param("recommendId") UUID recommendId,
		@Param("member") Member member
	);

	boolean existsByMemberIdAndCityIdAndIsDeletedFalse(Long memberId, Long cityId);

	boolean existsByIsDeletedFalseAndCityIdAndRecommendId(Long cityId, UUID recommendId);
}
