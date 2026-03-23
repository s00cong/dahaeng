package com.example.dahaeng.domain.tag;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class TagSeedInsertTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	private static final Map<String, List<String>> TAGS_BY_CATEGORY = createTagsByCategory();

	@Test
	void insertTravelTagsIfMissing() {
		int insertedCategoryCount = 0;
		int insertedTagCount = 0;

		for (Map.Entry<String, List<String>> entry : TAGS_BY_CATEGORY.entrySet()) {
			String categoryName = entry.getKey();
			Long categoryId = findCategoryId(categoryName);
			if (categoryId == null) {
				jdbcTemplate.update(
					"insert into category(name, created_at, updated_at, is_deleted) values (?, now(), now(), false)",
					categoryName
				);
				categoryId = findCategoryId(categoryName);
				insertedCategoryCount++;
			}

			for (String tagName : entry.getValue()) {
				Integer exists = jdbcTemplate.queryForObject(
					"select count(*) from tag where category_id = ? and name = ?",
					Integer.class,
					categoryId, tagName
				);
				if (exists == null || exists == 0) {
					jdbcTemplate.update(
						"insert into tag(category_id, name, created_at, updated_at, is_deleted) values (?, ?, now(), now(), false)",
						categoryId, tagName
					);
					insertedTagCount++;
				}
			}
		}

		int configuredTagCount = TAGS_BY_CATEGORY.values().stream().mapToInt(List::size).sum();
		Integer existingConfiguredTagCount = jdbcTemplate.queryForObject(
			"""
			select count(*)
			from tag t
			join category c on c.id = t.category_id
			where (c.name = 'Vibe' and t.name in ('여유로운','힙한','로컬감성','활기찬','럭셔리한','조용한','전통적인'))
			   or (c.name = 'Landscape' and t.name in ('도시의밤','푸른바다','초록대자연','역사속으로','눈부신설원','이국적인'))
			   or (c.name = 'Activity' and t.name in ('미식탐방','쇼핑중독','액티비티','예술과전시','사진에진심','배움이있는'))
			   or (c.name = 'Who' and t.name in ('나홀로','연인과','친구와','가족과'))
			   or (c.name = 'Climate' and t.name in ('따뜻한곳','추운곳','눈과함께','사계절','건조한','습한','열대','온화한'))
			""",
			Integer.class
		);

		System.out.println("Inserted categories: " + insertedCategoryCount);
		System.out.println("Inserted tags: " + insertedTagCount);
		System.out.println("Configured tags in DB: " + existingConfiguredTagCount);

		assertTrue(existingConfiguredTagCount != null && existingConfiguredTagCount >= configuredTagCount);
	}

	private Long findCategoryId(String categoryName) {
		List<Long> ids = jdbcTemplate.query(
			"select id from category where name = ? order by id asc limit 1",
			(rs, rowNum) -> rs.getLong("id"),
			categoryName
		);
		if (ids.isEmpty()) {
			return null;
		}
		return ids.get(0);
	}

	private static Map<String, List<String>> createTagsByCategory() {
		Map<String, List<String>> map = new LinkedHashMap<>();
		map.put("Vibe", List.of("여유로운", "힙한", "로컬감성", "활기찬", "럭셔리한", "조용한", "전통적인"));
		map.put("Landscape", List.of("도시의밤", "푸른바다", "초록대자연", "역사속으로", "눈부신설원", "이국적인"));
		map.put("Activity", List.of("미식탐방", "쇼핑중독", "액티비티", "예술과전시", "사진에진심", "배움이있는"));
		map.put("Who", List.of("나홀로", "연인과", "친구와", "가족과"));
		map.put("Climate", List.of("따뜻한곳", "추운곳", "눈과함께", "사계절", "건조한", "습한", "열대", "온화한"));
		return map;
	}
}
