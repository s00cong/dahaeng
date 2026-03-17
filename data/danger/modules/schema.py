"""danger table schema helpers."""

from __future__ import annotations


DANGER_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS `danger` (
    `id` BIGINT NOT NULL,
    `country_id` BIGINT NOT NULL,
    `city_id` BIGINT NULL,
    `attention` VARCHAR(10) NULL,
    `attention_partial` VARCHAR(255) NULL,
    `attention_note` VARCHAR(255) NULL,
    `ban_note` VARCHAR(255) NULL,
    `ban_yn_partial` VARCHAR(255) NULL,
    `ban_yna` VARCHAR(10) NULL,
    `control` VARCHAR(10) NULL,
    `control_partial` VARCHAR(255) NULL,
    `control_note` VARCHAR(255) NULL,
    `country_name` VARCHAR(20) NULL,
    `country_en_name` VARCHAR(50) NULL,
    `limita` VARCHAR(10) NULL,
    `limita_partial` VARCHAR(255) NULL,
    `limita_note` VARCHAR(255) NULL,
    `evacuate_rcmnd_remark` VARCHAR(255) NULL,
    `evacuate_region_ty` VARCHAR(255) NULL,
    `forbidden_rcmnd_remark` VARCHAR(255) NULL,
    `forbidden__region_ty` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `is_deleted` BOOLEAN NULL DEFAULT FALSE,
    PRIMARY KEY (`id`)
);
"""


def create_danger_tables(conn) -> None:
    """Create/alter danger table and foreign keys."""
    with conn.cursor() as cursor:
        cursor.execute(DANGER_TABLE_SQL)

        for alter_sql in (
            "ALTER TABLE `danger` ADD COLUMN `city_id` BIGINT NULL",
            "ALTER TABLE `danger` ADD COLUMN `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
            "ALTER TABLE `danger` ADD COLUMN `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
            "ALTER TABLE `danger` ADD COLUMN `is_deleted` BOOLEAN NULL DEFAULT FALSE",
        ):
            try:
                cursor.execute(alter_sql)
            except Exception:
                pass

        for fk_sql in (
            """
            ALTER TABLE `danger`
            ADD CONSTRAINT `FK_danger_country`
            FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
            """,
            """
            ALTER TABLE `danger`
            ADD CONSTRAINT `FK_danger_city`
            FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
            """,
        ):
            try:
                cursor.execute(fk_sql)
            except Exception:
                pass

    conn.commit()
