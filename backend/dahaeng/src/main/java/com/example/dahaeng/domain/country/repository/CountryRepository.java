package com.example.dahaeng.domain.country.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.dahaeng.domain.country.entity.Country;

public interface CountryRepository extends JpaRepository<Country, Long> {
	List<Country> findAllByIsDeletedFalse();

	List<Country> findAllByIdInAndIsDeletedFalse(List<Long> ids);
}
