package com.example.dahaeng.domain.country.repository;

import com.example.dahaeng.domain.country.entity.Danger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DangerRepository extends JpaRepository<Danger, Long> {
    @Query(
        """
        select d
        from Danger d join fetch d.country
        where d.isDeleted = false
                and d.country.id = :countryId
        """
    )
    Optional<Danger> findByCountryId(Long countryId);

    @Query("""
        select d
        from Danger d join fetch d.country
        where d.isDeleted = false
          and d.country.id in :countryIds
        """)
    List<Danger> findAllByCountryIds(List<Long> countryIds);
}
