package com.example.dahaeng.domain.member.repository;

import com.example.dahaeng.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Member findBySocialId(String socialId);
}
