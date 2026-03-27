package com.example.dahaeng.domain.livingcost.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.dahaeng.domain.country.enums.Continent;
import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCountry;
import com.example.dahaeng.domain.livingcost.enums.SortDirection;

public interface LivingCostOfCountryRepository extends JpaRepository<LivingCostOfCountry, Long> {
	@Query("select lcc from LivingCostOfCountry lcc join fetch lcc.country c where c.id = :id and lcc.isDeleted = false")
	Optional<LivingCostOfCountry> findOneByCountryId(Long id);

	@Query(
		"""
		select lcc
		from LivingCostOfCountry lcc
		where lcc.isDeleted = false
			and lcc.country.id in (:countryIds)
		"""
	)
	List<LivingCostOfCountry> findAllByCountryIds(List<Long> countryIds);

	@Query(
		"""
		select lcc
		from LivingCostOfCountry lcc join fetch lcc.country
		where lcc.isDeleted = false
			and (lcc.country.continent = :continent or lcc.country.continent is null)
		order by lcc.dailyBudget asc
		"""
	)
	List<LivingCostOfCountry> findAllByContinentOrderByDailyBudgetAsc(Continent continent);

	@Query(
		"""
		select lcc
		from LivingCostOfCountry lcc join fetch lcc.country
		where lcc.isDeleted = false
			and (lcc.country.continent = :continent or lcc.country.continent is null)
		order by lcc.dailyBudget desc
		"""
	)
	List<LivingCostOfCountry> findAllByContinentOrderByDailyBudgetDesc(Continent continent);

	@Query(
		"""
		select lcc
		from LivingCostOfCountry lcc join fetch lcc.country
		where lcc.isDeleted = false
				and lower(lcc.country.countryName) like concat('%', :keyword, '%') 
		"""
	)
	List<LivingCostOfCountry> findAllByNameKeyword(String keyword);
}
