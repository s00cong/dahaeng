package com.example.dahaeng.domain.tag.repository;

import com.example.dahaeng.domain.tag.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {
    // 활성화된 태그만 조회 (AI 분석 대상 태그 구분용 필드가 있다면 사용)
    // List<Tag> findByIsActiveTrue();

	@Query("select t from Tag t join fetch t.category")
	List<Tag> findAll();

	@Query("select t from Tag t where t.id in (:tagIds) and t.isDeleted = false")
	List<Tag> findAllByTagIds(Set<Long> tagIds);

	@Query("""
		select t
		from Tag t
		join fetch t.category c
		where lower(c.name) = lower(:categoryName)
			and lower(t.name) = lower(:tagName)
			and t.isDeleted = false
		""")
	Optional<Tag> findByCategoryNameAndTagName(String categoryName, String tagName);
}
