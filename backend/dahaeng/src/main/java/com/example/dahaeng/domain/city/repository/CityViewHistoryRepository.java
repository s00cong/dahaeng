package com.example.dahaeng.domain.city.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.dahaeng.domain.city.entity.CityViewHistory;
import com.example.dahaeng.domain.member.entity.Member;

public interface CityViewHistoryRepository extends JpaRepository<CityViewHistory, Long> {

	@Query(
		"""
		select cvh
		from CityViewHistory cvh join fetch cvh.city
		where cvh.member = :member
				and cvh.isDeleted = false
		order by cvh.updatedAt desc
		"""
	)
	List<CityViewHistory> findAllByMember(
		@Param("member") Member member,
		Pageable pageable
	);

	Optional<CityViewHistory> findFirstByCityIdAndMemberAndIsDeletedFalseOrderByUpdatedAt(
		@Param("cityId") Long cityId,
		@Param("member") Member member
	);
}
