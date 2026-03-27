package com.example.dahaeng.domain.place.repository;

import com.example.dahaeng.domain.place.entity.TouristSpot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TouristSpotRepository extends JpaRepository<TouristSpot, Long> {

    @Query(
        """
        select ts
        from TouristSpot ts
        where ts.isDeleted = false
                and ts.id = :id
        """
    )
    Optional<TouristSpot> findById(Long id);

    List<TouristSpot> findByCityId(Long cityId);
}
