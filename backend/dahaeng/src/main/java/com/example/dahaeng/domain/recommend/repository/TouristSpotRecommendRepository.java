package com.example.dahaeng.domain.recommend.repository;

import com.example.dahaeng.domain.place.entity.TouristSpot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TouristSpotRecommendRepository extends JpaRepository<TouristSpot, Long> {
    @Query(value = """
        select
            ts.id as spotId,
            ts.city_id as cityId,
            ts.tourist_name as placeName,
            ts.description as description,
            null as imageUrl,
            ts.address as address,
            ts.website as websiteUrl,
            ts.sns as socialUrl,
            ts.lat as lat,
            ts.lon as lon,
            coalesce(sum(case when t.name in (:selectedTags) then st.score else 0 end), 0) as matchScore
        from tourist_spot ts
        left join spot_tags st
            on st.tourist_spot_id = ts.id
           and st.is_deleted = b'0'
        left join tag t
            on t.id = st.tag_id
           and t.is_deleted = b'0'
        where ts.city_id in (:cityIds)
          and ts.is_deleted = b'0'
        group by ts.id, ts.city_id, ts.tourist_name, ts.description, ts.address, ts.website, ts.sns, ts.lat, ts.lon
        order by ts.city_id asc, matchScore desc, ts.id asc
        """, nativeQuery = true)
    List<SpotRecommendationProjection> findSpotCandidates(
            @Param("cityIds") List<Long> cityIds,
            @Param("selectedTags") List<String> selectedTags
    );
}
