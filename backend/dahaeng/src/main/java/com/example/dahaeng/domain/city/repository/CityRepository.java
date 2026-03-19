package com.example.dahaeng.domain.city.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import com.example.dahaeng.domain.city.entity.City;

@Repository
public interface CityRepository extends JpaRepository<City, Long> {
	List<City> findAllByIsDeletedFalse();

	List<City> findAllByCountryIdAndIsDeletedFalse(@Param("countryId") Long countryId);

	@Query(
		"""
		select c
		from City c
		where c.id = :id
			and c.isDeleted = false
		"""
	)
	Optional<City> findById(Long id);
}
