package com.example.dahaeng.domain.place.repository;

import com.example.dahaeng.domain.place.entity.SpotTag;
import com.example.dahaeng.domain.recommend.repository.CityTagAggregateProjection;
import com.example.dahaeng.domain.recommend.repository.SpotTagScoreProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SpotTagRepository extends JpaRepository<SpotTag, Long> {
    @Query(value = """
    select
        ts.city_id as cityId,
        count(distinct case when t.name in (:selectedTags) then ts.id end) as matchedSpotCount,
        coalesce(sum(case when t.name in (:selectedTags) then st.score else 0 end), 0) as matchedScoreSum
    from tourist_spot ts
    left join spot_tags st
        on st.tourist_spot_id = ts.id
       and st.is_deleted = b'0'
    left join tag t
        on t.id = st.tag_id
       and t.is_deleted = b'0'
    where ts.is_deleted = b'0'
    group by ts.city_id
    """, nativeQuery = true)
    List<CityTagAggregateProjection> aggregateCityTagScores(@Param("selectedTags") List<String> selectedTags);

    @Query(value = """
    select
        st.tourist_spot_id as spotId,
        t.name as tagName,
        st.score as score
    from spot_tags st
    join tag t
      on t.id = st.tag_id
     and t.is_deleted = b'0'
    where st.tourist_spot_id in (:spotIds)
      and t.name in (:selectedTags)
      and st.is_deleted = b'0'
    """, nativeQuery = true)
    List<SpotTagScoreProjection> findTagScoresBySpotIds(
            @Param("spotIds") List<Long> spotIds,
            @Param("selectedTags") List<String> selectedTags
    );

    @Query(
        value = """
        select
        st.tourist_spot_id as spotId,
        t.name as tagName,
        st.score as score
        from spot_tags st
        join tag t
        on t.id = st.tag_id
        and t.is_deleted = b'0'
        where st.tourist_spot_id = :spotId
        and st.is_deleted = b'0'
        """
    , nativeQuery = true)
    List<SpotTagScoreProjection> findTageScoresBySpotId(
        @Param("spotId") Long spotId
    );
}
