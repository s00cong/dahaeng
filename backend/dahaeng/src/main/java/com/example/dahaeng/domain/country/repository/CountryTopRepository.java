package com.example.dahaeng.domain.country.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.dahaeng.domain.country.entity.CountryTop;

public interface CountryTopRepository extends JpaRepository<CountryTop, Long> {

	@Query(
		"""
		select ct
		from CountryTop ct join fetch ct.country
		where ct.isDeleted = false
		order by ct.ranking
		"""
	)
	List<CountryTop> findTopCountry(Pageable pageable);
}
