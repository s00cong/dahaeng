package com.example.dahaeng.domain.recommend.repository;


import com.example.dahaeng.domain.city.entity.City;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecommendQueryRepository extends Repository<City, Long> {
    @Query(value = """
        select
            c.id as cityId,
            co.id as countryId,
            c.city_name as cityName,
            co.country_name as countryName,
            c.img_url as cityImageUrl,
            c.description as description,
            c.lat as lat,
            c.lon as lon,
            c.news_penalty_score as newsPenaltyScore,
            fs.avg_flight_price as avgFlightPrice,
            fs.avg_hotel_price as avgHotelPrice,
            lc.lunch_menu as lunchMenu,
            lc.dinner_in_a_resturant_for_2 as dinnerInAResturantFor2,
            lc.cappuccino as cappuccino,
            lc.coke_pepsi as cokePepsi,
            lc.local_transport_ticket as localTransportTicket,
            d.attention as dangerAttention,
            d.attention_partial as dangerAttentionPartial,
            d.control as dangerControl,
            d.limita as dangerLimita,
            co.currency as currency,
            fs.origin_airport as originAirport
        from city c
        join country co on co.id = c.country_id
        left join flight_summary fs
            on fs.city_id = c.id
           and fs.target_year_month = :yearMonth
           and fs.is_deleted = b'0'
        left join living_cost_of_city lc
            on lc.city_id = c.id
           and lc.is_deleted = b'0'
        left join danger d
            on d.country_id = co.id
           and d.is_deleted = b'0'
        where c.is_deleted = b'0'
        """, nativeQuery = true)
    List<CityCandidateProjection> findCityCandidates(@Param("yearMonth") String yearMonth);


}
