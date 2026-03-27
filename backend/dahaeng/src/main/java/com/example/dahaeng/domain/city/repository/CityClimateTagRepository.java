package com.example.dahaeng.domain.city.repository;

import com.example.dahaeng.domain.city.entity.CityClimateTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CityClimateTagRepository extends JpaRepository<CityClimateTag, Long> {

    @Query("""
    select cct
    from CityClimateTag cct
    join fetch cct.tag t
    where cct.city.id = :cityId
      and cct.month = :month
      and t.name in :tagNames
    order by cct.score desc
""")
    List<CityClimateTag> findByCityIdAndMonthAndTagNames(
            @Param("cityId") Long cityId,
            @Param("month") Long month,
            @Param("tagNames") List<String> tagNames
    );

    @Query("""
    select cct
    from CityClimateTag cct
    join fetch cct.tag t
    join fetch cct.city c
    where cct.month = :month
      and t.name in :tagNames
      and cct.isDeleted = false
      and t.isDeleted = false
      and c.isDeleted = false
""")
    List<CityClimateTag> findAllByMonthAndTagNames(
            @Param("month") Long month,
            @Param("tagNames") List<String> tagNames
    );
}
