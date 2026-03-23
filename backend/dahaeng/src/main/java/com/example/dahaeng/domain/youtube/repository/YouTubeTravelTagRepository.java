package com.example.dahaeng.domain.youtube.repository;

import com.example.dahaeng.domain.youtube.entity.YouTubeTravelTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface YouTubeTravelTagRepository extends JpaRepository<YouTubeTravelTag, Long> {
    
    @Modifying
    @Transactional
    void deleteByAccount_Id(Long accountId);
    
    List<YouTubeTravelTag> findByAccount_Id(Long accountId);

    @Query("""
            select ytt
            from YouTubeTravelTag ytt
            left join fetch ytt.tag t
            left join fetch t.category
            where ytt.account.id = :accountId
            """)
    List<YouTubeTravelTag> findAllByAccountIdWithTag(@Param("accountId") Long accountId);
}
