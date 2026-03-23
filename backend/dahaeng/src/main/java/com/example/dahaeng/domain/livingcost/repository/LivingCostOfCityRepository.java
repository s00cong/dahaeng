package com.example.dahaeng.domain.livingcost.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;

public interface LivingCostOfCityRepository extends JpaRepository<LivingCostOfCity, Long> {
	@Query("select lcc from LivingCostOfCity lcc join fetch lcc.city c join fetch c.country where c.id = :id and lcc.isDeleted = false")
	Optional<LivingCostOfCity> findOneByCityId(Long id);
	@Query(
		"""
		select lcc
		from LivingCostOfCity lcc
		where lcc.city in ( :cities )
				and lcc.isDeleted = false
		"""
	)
	List<LivingCostOfCity> findAllInCities(List<City> cities);

	@Query(
		"""
		select lcc
		from LivingCostOfCity lcc join fetch lcc.city join fetch lcc.city.country
		where lcc.isDeleted = false
			and lower(lcc.city.country.countryName) like concat('%', :keyword, '%') 
		order by lcc.dailyBudget asc
		"""
	)
	List<LivingCostOfCity> findAllByCountryKeywordOrderByDailyBudgetAsc(String keyword);

	@Query(
		"""
		select lcc
		from LivingCostOfCity lcc join fetch lcc.city join fetch lcc.city.country
		where lcc.isDeleted = false
			and lower(lcc.city.country.countryName) like concat('%', :keyword, '%') 
		order by lcc.dailyBudget desc
		"""
	)
	List<LivingCostOfCity> findAllByCountryKeywordOrderByDailyBudgetDesc(String keyword);

	@Query(
		"""
		select lcc
		from LivingCostOfCity lcc join fetch lcc.city
		where lcc.isDeleted = false
			and lower(lcc.city.cityName) like concat('%', :keyword, '%') 
		"""
	)
	List<LivingCostOfCity> findAllByNameKeyword(String keyword);
}
