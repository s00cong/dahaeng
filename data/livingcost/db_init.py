"""DB schema bootstrap and connection helpers."""

import os
import pymysql


create_table_queries = {
    "exchange": """
    CREATE TABLE IF NOT EXISTS `exchanges` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `currency` VARCHAR(10) NOT NULL,
        `display_unit` INT NULL,
        `display_symbol` VARCHAR(10) NULL,
        `rate_1krw_to_cur` DOUBLE NULL,
        `krw_per_1cur` DOUBLE NULL,
        `krw_per_display_unit` DOUBLE NULL,
        `event_date` DATE NULL,
        `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `is_deleted` BOOLEAN NULL DEFAULT FALSE,
        PRIMARY KEY (`id`)
    );
    """,
    "country": """
    CREATE TABLE IF NOT EXISTS `country` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `currency` VARCHAR(10) NOT NULL,
        `country_name` VARCHAR(50) NULL,
        `continent` VARCHAR(20) NULL,
        `img_url` TEXT NULL,
        `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `is_deleted` BOOLEAN NULL DEFAULT FALSE,
        `lat` DOUBLE NULL,
        `lon` DOUBLE NULL,
        PRIMARY KEY (`id`)
    );
    """,
    "city": """
    CREATE TABLE IF NOT EXISTS `city` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `country_id` BIGINT NOT NULL,
        `city_name` VARCHAR(50) NULL,
        `img_url` TEXT NULL,
        `is_deleted` BOOLEAN NULL DEFAULT FALSE,
        `description` TEXT NULL,
        `lat` DOUBLE NULL,
        `lon` DOUBLE NULL,
        `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        CONSTRAINT `fk_city_country`
            FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
    );
    """,
    "living_cost_of_country": """
    CREATE TABLE IF NOT EXISTS `living_cost_of_country` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `country_id` BIGINT NOT NULL,
        `daily_budget` DOUBLE NULL,
        `without_rent` DOUBLE NULL,
        `food` DOUBLE NULL,
        `transport` DOUBLE NULL,
        `monthly_salary_after_tax` DOUBLE NULL,
        `population` DOUBLE NULL,
        `lunch_menu` DOUBLE NULL,
        `dinner_in_a_resturant_for_2` DOUBLE NULL,
        `fast_food_meal` DOUBLE NULL,
        `beer_in_a_pub` DOUBLE NULL,
        `cappuccino` DOUBLE NULL,
        `coke_pepsi` DOUBLE NULL,
        `local_transport_ticket` DOUBLE NULL,
        `monthly_ticket_local_transport` DOUBLE NULL,
        `taxi_ride` DOUBLE NULL,
        `gas_petrol` DOUBLE NULL,
        `milk` DOUBLE NULL,
        `bread` DOUBLE NULL,
        `rice` DOUBLE NULL,
        `egg` DOUBLE NULL,
        `chicken` DOUBLE NULL,
        `steak` DOUBLE NULL,
        `apple` DOUBLE NULL,
        `banana` DOUBLE NULL,
        `orange` DOUBLE NULL,
        `tomato` DOUBLE NULL,
        `potato` DOUBLE NULL,
        `onion` DOUBLE NULL,
        `water` DOUBLE NULL,
        `coke` DOUBLE NULL,
        `wine` DOUBLE NULL,
        `beer` DOUBLE NULL,
        `cigarette` DOUBLE NULL,
        `cold_medicine` DOUBLE NULL,
        `shampoo` DOUBLE NULL,
        `toilet_paper` DOUBLE NULL,
        `toothpaste` DOUBLE NULL,
        `gym_month` DOUBLE NULL,
        `cinema_ticket` DOUBLE NULL,
        `haircut` DOUBLE NULL,
        `brand_jeans` DOUBLE NULL,
        `brand_sneakers` DOUBLE NULL,
        `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `is_deleted` BOOLEAN NULL DEFAULT FALSE,
        PRIMARY KEY (`id`),
        CONSTRAINT `fk_living_cost_of_country_country`
            FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
    );
    """,
    "living_cost_of_city": """
    CREATE TABLE IF NOT EXISTS `living_cost_of_city` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `city_id` BIGINT NOT NULL,
        `daily_budget` DOUBLE NULL,
        `without_rent` DOUBLE NOT NULL,
        `food` DOUBLE NOT NULL,
        `transport` DOUBLE NOT NULL,
        `monthly_salary_after_tax` DOUBLE NULL,
        `population` DOUBLE NOT NULL,
        `lunch_menu` DOUBLE NOT NULL,
        `dinner_in_a_resturant_for_2` DOUBLE NULL,
        `fast_food_meal` DOUBLE NULL,
        `beer_in_a_pub` DOUBLE NULL,
        `cappuccino` DOUBLE NULL,
        `coke_pepsi` DOUBLE NULL,
        `local_transport_ticket` DOUBLE NULL,
        `monthly_ticket_local_transport` DOUBLE NULL,
        `taxi_ride` DOUBLE NULL,
        `gas_petrol` DOUBLE NULL,
        `milk` DOUBLE NULL,
        `bread` DOUBLE NULL,
        `rice` DOUBLE NULL,
        `egg` DOUBLE NULL,
        `chicken` DOUBLE NULL,
        `steak` DOUBLE NULL,
        `apple` DOUBLE NULL,
        `banana` DOUBLE NULL,
        `orange` DOUBLE NULL,
        `tomato` DOUBLE NULL,
        `potato` DOUBLE NULL,
        `onion` DOUBLE NULL,
        `water` DOUBLE NULL,
        `coke` DOUBLE NULL,
        `wine` DOUBLE NULL,
        `beer` DOUBLE NULL,
        `cigarette` DOUBLE NULL,
        `cold_medicine` DOUBLE NULL,
        `shampoo` DOUBLE NULL,
        `toilet_paper` DOUBLE NULL,
        `toothpaste` DOUBLE NULL,
        `gym_month` DOUBLE NULL,
        `cinema_ticket` DOUBLE NULL,
        `haircut` DOUBLE NULL,
        `brand_jeans` DOUBLE NULL,
        `brand_sneakers` DOUBLE NULL,
        `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `is_deleted` BOOLEAN NULL DEFAULT FALSE,
        PRIMARY KEY (`id`),
        CONSTRAINT `fk_living_cost_of_city_city`
            FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
    );
    """,
}


def get_db_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "j14d206.p.ssafy.io"),
        user=os.getenv("DB_USER", "d206"),
        password=os.getenv("DB_PASSWORD", "d206-1111"),
        database=os.getenv("DB_NAME", "dahaeng"),
        port=int(os.getenv("DB_PORT", "8900")),
        charset="utf8mb4",
        autocommit=False,
    )


def create_tables_if_not_exists(conn=None):
    """紐⑤뱺 CREATE TABLE IF NOT EXISTS 荑쇰━瑜??ㅽ뻾?쒕떎."""
    own_conn = conn is None
    if own_conn:
        conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            for table_name, query in create_table_queries.items():
                cursor.execute(query)
                print(f"{table_name} table ensured")
        conn.commit()
    finally:
        if own_conn:
            conn.close()


if __name__ == "__main__":
    create_tables_if_not_exists()
