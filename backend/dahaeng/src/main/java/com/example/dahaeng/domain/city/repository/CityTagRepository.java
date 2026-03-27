package com.example.dahaeng.domain.city.repository;

import com.example.dahaeng.domain.city.entity.CityTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CityTagRepository extends JpaRepository<CityTag, Long> {
    @Query("""
    select ct
    from CityTag ct
    join fetch ct.tag
    where ct.city.id = :cityId
    order by ct.tagScore desc
""")
    List<CityTag> findCityTagsByCityId(@Param("cityId") Long cityId);

    @Query("""
    select ct
    from CityTag ct
    join fetch ct.tag t
    where ct.city.id = :cityId
      and t.name in :tagNames
    order by ct.tagScore desc
""")
    List<CityTag> findCityTagsByCityIdAndTagNames(
            @Param("cityId") Long cityId,
            @Param("tagNames") List<String> tagNames
    );

    @Query("""
    select ct
    from CityTag ct
    join fetch ct.tag t
    join fetch ct.city c
    where t.name in :tagNames
      and ct.isDeleted = false
      and t.isDeleted = false
      and c.isDeleted = false
""")
    List<CityTag> findAllByTagNames(@Param("tagNames") List<String> tagNames);
}
