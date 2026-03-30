-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema dahaeng
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema dahaeng
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `dahaeng` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ;
USE `dahaeng` ;

-- -----------------------------------------------------
-- Table `dahaeng`.`member`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`member` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `deleted_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `role` VARCHAR(20) NOT NULL,
  `nickname` VARCHAR(50) NOT NULL,
  `social_id` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `profileImageUrl` TEXT NULL DEFAULT NULL,
  `profile_image_url` TEXT NULL DEFAULT NULL,
  `email_alert_enabled` BIT(1) NOT NULL DEFAULT b'1',
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 12
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`country`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`country` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `lat` DOUBLE NULL DEFAULT NULL,
  `lon` DOUBLE NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `country_name` VARCHAR(50) NULL DEFAULT NULL,
  `img_url` TEXT NULL DEFAULT NULL,
  `continent` ENUM('AFRICA', 'ASIA', 'EUROPE', 'NORTH_AMERICA', 'OCEANIA', 'SOUTH_AMERICA') NULL DEFAULT NULL,
  `currency` ENUM('KRW', 'USD', 'VND', 'JPY', 'CNY', 'HKD', 'MOP', 'THB', 'PHP', 'EUR', 'RUB', 'AUD', 'TWD', 'GBP', 'SGD', 'IDR', 'MYR', 'CAD', 'KHR', 'MNT', 'NZD', 'INR', 'BRL', 'CHF', 'MXN', 'HUF', 'TRY', 'ZAR', 'LAK', 'CZK', 'AED', 'MVR', 'QAR', 'PLN', 'SEK', 'NOK', 'PEN', 'EGP', 'MUR', 'ISK', 'DKK', 'BOB', 'ARS', 'CLP', 'NPR', 'KZT', 'MAD', 'CUP', 'KES') NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 59
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`city`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`city` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `lat` DOUBLE NULL DEFAULT NULL,
  `lon` DOUBLE NULL DEFAULT NULL,
  `news_penalty_score` DOUBLE NULL DEFAULT NULL,
  `country_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `city_name` VARCHAR(50) NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `img_url` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKrpd7j1p7yxr784adkx4pyepba` (`country_id` ASC) VISIBLE,
  CONSTRAINT `FKrpd7j1p7yxr784adkx4pyepba`
    FOREIGN KEY (`country_id`)
    REFERENCES `dahaeng`.`country` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 163
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`bookmark`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`bookmark` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `city_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `member_id` BIGINT NOT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `json` TEXT NULL DEFAULT NULL,
  `recommend_id` BINARY(16) NULL DEFAULT NULL,
  `title` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKne2a5hh2hcvrhtx8vyqybg3tx` (`city_id` ASC) VISIBLE,
  INDEX `FK5bm7rup91j277mc7gg63akie2` (`member_id` ASC) VISIBLE,
  CONSTRAINT `FK5bm7rup91j277mc7gg63akie2`
    FOREIGN KEY (`member_id`)
    REFERENCES `dahaeng`.`member` (`id`),
  CONSTRAINT `FKne2a5hh2hcvrhtx8vyqybg3tx`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 44
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`category`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`category` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `name` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 6
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`tag`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`tag` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `category_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `name` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKruoloyh4bf4kdko2ccv18xyyx` (`category_id` ASC) VISIBLE,
  CONSTRAINT `FKruoloyh4bf4kdko2ccv18xyyx`
    FOREIGN KEY (`category_id`)
    REFERENCES `dahaeng`.`category` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 32
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`city_climate_tag`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`city_climate_tag` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `city_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `month` BIGINT NOT NULL,
  `tag_id` BIGINT NOT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `score` DOUBLE NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKre0ncobp35c8g6kf8i1dwrxya` (`city_id` ASC) VISIBLE,
  INDEX `FKp4s9itmv6vtimot6q8y13w0sh` (`tag_id` ASC) VISIBLE,
  CONSTRAINT `FKp4s9itmv6vtimot6q8y13w0sh`
    FOREIGN KEY (`tag_id`)
    REFERENCES `dahaeng`.`tag` (`id`),
  CONSTRAINT `FKre0ncobp35c8g6kf8i1dwrxya`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 15457
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`city_tag`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`city_tag` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `tag_score` DOUBLE NULL DEFAULT NULL,
  `city_id` BIGINT NOT NULL,
  `tag_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKb4y91h6i2qx3i40su2lrncf0p` (`city_id` ASC) VISIBLE,
  INDEX `FKbq0h6344yr2jbera7hhpqj6wi` (`tag_id` ASC) VISIBLE,
  CONSTRAINT `FKb4y91h6i2qx3i40su2lrncf0p`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`),
  CONSTRAINT `FKbq0h6344yr2jbera7hhpqj6wi`
    FOREIGN KEY (`tag_id`)
    REFERENCES `dahaeng`.`tag` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 963
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`city_view_history`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`city_view_history` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `city_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `member_id` BIGINT NOT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKf2jutgs69tt63aixeir1oawap` (`city_id` ASC) VISIBLE,
  INDEX `FK61n401r2k5o3a775iwavyrax2` (`member_id` ASC) VISIBLE,
  CONSTRAINT `FK61n401r2k5o3a775iwavyrax2`
    FOREIGN KEY (`member_id`)
    REFERENCES `dahaeng`.`member` (`id`),
  CONSTRAINT `FKf2jutgs69tt63aixeir1oawap`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 648
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`climate`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`climate` (
  `humidity` DOUBLE NULL DEFAULT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `month` INT NULL DEFAULT NULL,
  `precipitation` DOUBLE NULL DEFAULT NULL,
  `snowfall` DOUBLE NULL DEFAULT NULL,
  `temperature` DOUBLE NULL DEFAULT NULL,
  `city_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FK4b16l3lvhq3oiu7otc3yysx1d` (`city_id` ASC) VISIBLE,
  CONSTRAINT `FK4b16l3lvhq3oiu7otc3yysx1d`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`country_top`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`country_top` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `ranking` INT NULL DEFAULT NULL,
  `country_id` BIGINT NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKevtn4su91b87lnfma0va6wjxo` (`country_id` ASC) VISIBLE,
  CONSTRAINT `FKevtn4su91b87lnfma0va6wjxo`
    FOREIGN KEY (`country_id`)
    REFERENCES `dahaeng`.`country` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 6
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`danger`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`danger` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `country_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `attention` VARCHAR(10) NULL DEFAULT NULL,
  `control` VARCHAR(10) NULL DEFAULT NULL,
  `limita` VARCHAR(10) NULL DEFAULT NULL,
  `country_name` VARCHAR(20) NULL DEFAULT NULL,
  `country_en_name` VARCHAR(100) NULL DEFAULT NULL,
  `attention_note` VARCHAR(255) NULL DEFAULT NULL,
  `attention_partial` VARCHAR(255) NULL DEFAULT NULL,
  `ban_note` VARCHAR(255) NULL DEFAULT NULL,
  `ban_yn_partial` VARCHAR(255) NULL DEFAULT NULL,
  `ban_yna` VARCHAR(255) NULL DEFAULT NULL,
  `control_note` VARCHAR(255) NULL DEFAULT NULL,
  `control_partial` VARCHAR(255) NULL DEFAULT NULL,
  `evacuate_rcmnd_remark` VARCHAR(255) NULL DEFAULT NULL,
  `evacuate_region_ty` VARCHAR(255) NULL DEFAULT NULL,
  `forbidden__region_ty` VARCHAR(255) NULL DEFAULT NULL,
  `forbidden_rcmnd_remark` VARCHAR(255) NULL DEFAULT NULL,
  `limita_note` VARCHAR(255) NULL DEFAULT NULL,
  `limita_partial` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKonw5f3hfp05f1t2volqfh83m7` (`country_id` ASC) VISIBLE,
  CONSTRAINT `FKonw5f3hfp05f1t2volqfh83m7`
    FOREIGN KEY (`country_id`)
    REFERENCES `dahaeng`.`country` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`exchanges`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`exchanges` (
  `display_unit` INT NULL DEFAULT NULL,
  `event_date` DATE NULL DEFAULT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `krw_per_1cur` DOUBLE NULL DEFAULT NULL,
  `krw_per_display_unit` DOUBLE NULL DEFAULT NULL,
  `rate_1krw_to_cur` DOUBLE NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `display_symbol` VARCHAR(15) NULL DEFAULT NULL,
  `currency` ENUM('AED', 'ARS', 'AUD', 'BOB', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'CUP', 'CZK', 'DKK', 'EGP', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'INR', 'ISK', 'JPY', 'KES', 'KHR', 'KRW', 'KZT', 'LAK', 'MAD', 'MNT', 'MOP', 'MUR', 'MVR', 'MXN', 'MYR', 'NOK', 'NPR', 'NZD', 'PEN', 'PHP', 'PLN', 'QAR', 'RUB', 'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'USD', 'VND', 'ZAR') NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 120650
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`flight_alert_subscription`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`flight_alert_subscription` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `member_id` BIGINT NOT NULL,
  `city_id` BIGINT NOT NULL,
  `threshold_price` INT NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT '1',
  `last_notified_price` INT NULL DEFAULT NULL,
  `last_notified_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_flight_alert_subscription_member_city` (`member_id` ASC, `city_id` ASC) VISIBLE,
  INDEX `fk_flight_alert_subscription_city` (`city_id` ASC) VISIBLE,
  CONSTRAINT `fk_flight_alert_subscription_city`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`),
  CONSTRAINT `fk_flight_alert_subscription_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `dahaeng`.`member` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`flight_alert_notification`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`flight_alert_notification` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `subscription_id` BIGINT NOT NULL,
  `member_id` BIGINT NOT NULL,
  `city_id` BIGINT NOT NULL,
  `alert_type` VARCHAR(20) NOT NULL,
  `threshold_price` INT NOT NULL,
  `matched_price` INT NOT NULL,
  `departure_date` DATE NOT NULL,
  `return_date` DATE NOT NULL,
  `collected_date` DATE NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT '0',
  `read_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT '0',
  `best_match_date` DATE NOT NULL,
  `collected_at` DATETIME(6) NOT NULL,
  `matched_date_count` INT NOT NULL,
  `best_price_date` DATE NOT NULL,
  `nearest_match_date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_flight_alert_notification_subscription` (`subscription_id` ASC) VISIBLE,
  INDEX `fk_flight_alert_notification_member` (`member_id` ASC) VISIBLE,
  INDEX `fk_flight_alert_notification_city` (`city_id` ASC) VISIBLE,
  CONSTRAINT `fk_flight_alert_notification_city`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`),
  CONSTRAINT `fk_flight_alert_notification_member`
    FOREIGN KEY (`member_id`)
    REFERENCES `dahaeng`.`member` (`id`),
  CONSTRAINT `fk_flight_alert_notification_subscription`
    FOREIGN KEY (`subscription_id`)
    REFERENCES `dahaeng`.`flight_alert_subscription` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`flight_summary`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`flight_summary` (
  `avg_flight_price` INT NULL DEFAULT NULL,
  `avg_hotel_price` INT NULL DEFAULT NULL,
  `flight_duration` INT NULL DEFAULT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `stops` INT NULL DEFAULT NULL,
  `city_id` BIGINT NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `flight_collected_date` DATETIME(6) NULL DEFAULT NULL,
  `hotel_collected_date` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `off_month_list` VARCHAR(255) NULL DEFAULT NULL,
  `origin_airport` VARCHAR(255) NULL DEFAULT NULL,
  `peak_month_list` VARCHAR(255) NULL DEFAULT NULL,
  `target_year_month` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_city_year_month` (`city_id` ASC, `target_year_month` ASC) VISIBLE,
  CONSTRAINT `FK6wrusyjwbdhhnsp9xkarbma53`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 16767
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`living_cost_of_city`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`living_cost_of_city` (
  `apple` DOUBLE NULL DEFAULT NULL,
  `banana` DOUBLE NULL DEFAULT NULL,
  `beer` DOUBLE NULL DEFAULT NULL,
  `beer_in_a_pub` DOUBLE NULL DEFAULT NULL,
  `brand_jeans` DOUBLE NULL DEFAULT NULL,
  `brand_sneakers` DOUBLE NULL DEFAULT NULL,
  `bread` DOUBLE NULL DEFAULT NULL,
  `cappuccino` DOUBLE NULL DEFAULT NULL,
  `chicken` DOUBLE NULL DEFAULT NULL,
  `cigarette` DOUBLE NULL DEFAULT NULL,
  `cinema_ticket` DOUBLE NULL DEFAULT NULL,
  `coke` DOUBLE NULL DEFAULT NULL,
  `coke_pepsi` DOUBLE NULL DEFAULT NULL,
  `cold_medicine` DOUBLE NULL DEFAULT NULL,
  `daily_budget` DOUBLE NULL DEFAULT NULL,
  `dinner_in_a_resturant_for_2` DOUBLE NULL DEFAULT NULL,
  `egg` DOUBLE NULL DEFAULT NULL,
  `fast_food_meal` DOUBLE NULL DEFAULT NULL,
  `food` DOUBLE NOT NULL,
  `gas_petrol` DOUBLE NULL DEFAULT NULL,
  `gym_month` DOUBLE NULL DEFAULT NULL,
  `haircut` DOUBLE NULL DEFAULT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `local_transport_ticket` DOUBLE NULL DEFAULT NULL,
  `lunch_menu` DOUBLE NOT NULL,
  `milk` DOUBLE NULL DEFAULT NULL,
  `monthly_salary_after_tax` DOUBLE NULL DEFAULT NULL,
  `monthly_ticket_local_transport` DOUBLE NULL DEFAULT NULL,
  `onion` DOUBLE NULL DEFAULT NULL,
  `orange` DOUBLE NULL DEFAULT NULL,
  `population` DOUBLE NOT NULL,
  `potato` DOUBLE NULL DEFAULT NULL,
  `rice` DOUBLE NULL DEFAULT NULL,
  `shampoo` DOUBLE NULL DEFAULT NULL,
  `steak` DOUBLE NULL DEFAULT NULL,
  `taxi_ride` DOUBLE NULL DEFAULT NULL,
  `toilet_paper` DOUBLE NULL DEFAULT NULL,
  `tomato` DOUBLE NULL DEFAULT NULL,
  `toothpaste` DOUBLE NULL DEFAULT NULL,
  `transport` DOUBLE NOT NULL,
  `water` DOUBLE NULL DEFAULT NULL,
  `wine` DOUBLE NULL DEFAULT NULL,
  `without_rent` DOUBLE NOT NULL,
  `city_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKis009rqdjmen4mb8bjoqwv6wq` (`city_id` ASC) VISIBLE,
  CONSTRAINT `FKis009rqdjmen4mb8bjoqwv6wq`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 680
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`living_cost_of_country`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`living_cost_of_country` (
  `apple` DOUBLE NULL DEFAULT NULL,
  `banana` DOUBLE NULL DEFAULT NULL,
  `beer` DOUBLE NULL DEFAULT NULL,
  `beer_in_a_pub` DOUBLE NULL DEFAULT NULL,
  `brand_jeans` DOUBLE NULL DEFAULT NULL,
  `brand_sneakers` DOUBLE NULL DEFAULT NULL,
  `bread` DOUBLE NULL DEFAULT NULL,
  `cappuccino` DOUBLE NULL DEFAULT NULL,
  `chicken` DOUBLE NULL DEFAULT NULL,
  `cigarette` DOUBLE NULL DEFAULT NULL,
  `cinema_ticket` DOUBLE NULL DEFAULT NULL,
  `coke` DOUBLE NULL DEFAULT NULL,
  `coke_pepsi` DOUBLE NULL DEFAULT NULL,
  `cold_medicine` DOUBLE NULL DEFAULT NULL,
  `daily_budget` DOUBLE NULL DEFAULT NULL,
  `dinner_in_a_resturant_for_2` DOUBLE NULL DEFAULT NULL,
  `egg` DOUBLE NULL DEFAULT NULL,
  `fast_food_meal` DOUBLE NULL DEFAULT NULL,
  `food` DOUBLE NULL DEFAULT NULL,
  `gas_petrol` DOUBLE NULL DEFAULT NULL,
  `gym_month` DOUBLE NULL DEFAULT NULL,
  `haircut` DOUBLE NULL DEFAULT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `local_transport_ticket` DOUBLE NULL DEFAULT NULL,
  `lunch_menu` DOUBLE NULL DEFAULT NULL,
  `milk` DOUBLE NULL DEFAULT NULL,
  `monthly_salary_after_tax` DOUBLE NULL DEFAULT NULL,
  `monthly_ticket_local_transport` DOUBLE NULL DEFAULT NULL,
  `onion` DOUBLE NULL DEFAULT NULL,
  `orange` DOUBLE NULL DEFAULT NULL,
  `population` DOUBLE NULL DEFAULT NULL,
  `potato` DOUBLE NULL DEFAULT NULL,
  `rice` DOUBLE NULL DEFAULT NULL,
  `shampoo` DOUBLE NULL DEFAULT NULL,
  `steak` DOUBLE NULL DEFAULT NULL,
  `taxi_ride` DOUBLE NULL DEFAULT NULL,
  `toilet_paper` DOUBLE NULL DEFAULT NULL,
  `tomato` DOUBLE NULL DEFAULT NULL,
  `toothpaste` DOUBLE NULL DEFAULT NULL,
  `transport` DOUBLE NULL DEFAULT NULL,
  `water` DOUBLE NULL DEFAULT NULL,
  `wine` DOUBLE NULL DEFAULT NULL,
  `without_rent` DOUBLE NULL DEFAULT NULL,
  `country_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FK1ijl0vpfaaitwkr3lai02iye3` (`country_id` ASC) VISIBLE,
  CONSTRAINT `FK1ijl0vpfaaitwkr3lai02iye3`
    FOREIGN KEY (`country_id`)
    REFERENCES `dahaeng`.`country` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 238
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`member_tag`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`member_tag` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `is_from_youtube` BIT(1) NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `member_id` BIGINT NOT NULL,
  `tag_id` BIGINT NOT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKgodbg35wb92j09pt5pi64udco` (`member_id` ASC) VISIBLE,
  INDEX `FKcg8t5r0fghpy478wylesc2sfj` (`tag_id` ASC) VISIBLE,
  CONSTRAINT `FKcg8t5r0fghpy478wylesc2sfj`
    FOREIGN KEY (`tag_id`)
    REFERENCES `dahaeng`.`tag` (`id`),
  CONSTRAINT `FKgodbg35wb92j09pt5pi64udco`
    FOREIGN KEY (`member_id`)
    REFERENCES `dahaeng`.`member` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 236
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`tourist_spot`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`tourist_spot` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `address` TEXT NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `imageUrl` TEXT NULL DEFAULT NULL,
  `lat` DOUBLE NULL DEFAULT NULL,
  `lon` DOUBLE NULL DEFAULT NULL,
  `sns` TEXT NULL DEFAULT NULL,
  `tourist_name` VARCHAR(50) NOT NULL,
  `website` TEXT NULL DEFAULT NULL,
  `city_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKeej4nk6ufih18jd8mghfn8pte` (`city_id` ASC) VISIBLE,
  CONSTRAINT `FKeej4nk6ufih18jd8mghfn8pte`
    FOREIGN KEY (`city_id`)
    REFERENCES `dahaeng`.`city` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 2952
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`spot_tags`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`spot_tags` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `score` DOUBLE NOT NULL,
  `tag_id` BIGINT NOT NULL,
  `tourist_spot_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKmtduti60ub98oolsjtn1denmw` (`tag_id` ASC) VISIBLE,
  INDEX `FK7p6ftuklgcvinq5i622e51ml7` (`tourist_spot_id` ASC) VISIBLE,
  CONSTRAINT `FK7p6ftuklgcvinq5i622e51ml7`
    FOREIGN KEY (`tourist_spot_id`)
    REFERENCES `dahaeng`.`tourist_spot` (`id`),
  CONSTRAINT `FKmtduti60ub98oolsjtn1denmw`
    FOREIGN KEY (`tag_id`)
    REFERENCES `dahaeng`.`tag` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 3227
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`stg_flight_summary`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`stg_flight_summary` (
  `city_id` BIGINT NULL DEFAULT NULL,
  `year_month` LONGTEXT NULL DEFAULT NULL,
  `origin_airport` LONGTEXT NULL DEFAULT NULL,
  `avg_flight_price` INT NULL DEFAULT NULL,
  `avg_hotel_price` INT NULL DEFAULT NULL,
  `stops` INT NULL DEFAULT NULL,
  `flight_duration` INT NULL DEFAULT NULL,
  `peak_month_list` LONGTEXT NULL DEFAULT NULL,
  `off_month_list` LONGTEXT NULL DEFAULT NULL,
  `flight_collected_date` TIMESTAMP NULL DEFAULT NULL,
  `hotel_collected_date` TIMESTAMP NULL DEFAULT NULL)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_account`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_account` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `last_synced_at` DATETIME(6) NULL DEFAULT NULL,
  `member_id` BIGINT NOT NULL,
  `token_expires_at` DATETIME(6) NULL DEFAULT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `google_email` VARCHAR(100) NULL DEFAULT NULL,
  `youtube_channel_id` VARCHAR(100) NULL DEFAULT NULL,
  `access_token` TEXT NULL DEFAULT NULL,
  `refresh_token` TEXT NULL DEFAULT NULL,
  `sync_status` ENUM('FAILED', 'PENDING', 'SYNCED') NOT NULL,
  `sync_disabled_at` DATETIME(6) NULL DEFAULT NULL,
  `sync_enabled` BIT(1) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UKhllxgbjwxgs3u9lf1lcg2rjvi` (`member_id` ASC) VISIBLE,
  UNIQUE INDEX `UK25xup9me24hsm95wqbtcsaggi` (`youtube_channel_id` ASC) VISIBLE,
  CONSTRAINT `FKg7vwu4nh97fjdgloycvq67mbh`
    FOREIGN KEY (`member_id`)
    REFERENCES `dahaeng`.`member` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 13
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_interest_keyword`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_interest_keyword` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `score` DOUBLE NOT NULL,
  `account_id` BIGINT NOT NULL,
  `analyzed_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `keyword` VARCHAR(100) NOT NULL,
  `normalized_keyword` VARCHAR(100) NULL DEFAULT NULL,
  `source_type` ENUM('LIKED_VIDEO_TAG', 'LIKED_VIDEO_TITLE', 'PLAYLIST_TITLE', 'PLAYLIST_VIDEO_TAG', 'PLAYLIST_VIDEO_TITLE', 'SUBSCRIPTION_TITLE') NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKl5ido3f6fes3vj684up6kcxaf` (`account_id` ASC) VISIBLE,
  CONSTRAINT `FKl5ido3f6fes3vj684up6kcxaf`
    FOREIGN KEY (`account_id`)
    REFERENCES `dahaeng`.`youtube_account` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 17884
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_video`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_video` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `category_id` VARCHAR(20) NULL DEFAULT NULL,
  `youtube_video_id` VARCHAR(50) NOT NULL,
  `channel_title` VARCHAR(100) NULL DEFAULT NULL,
  `title` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UK40wap4enj5jyfoq8l7mh66nlv` (`youtube_video_id` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 339
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_liked_video`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_liked_video` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `account_id` BIGINT NOT NULL,
  `collected_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `liked_at` DATETIME(6) NULL DEFAULT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `video_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKi8sc7mc5wyctg9n6hte4723fx` (`account_id` ASC) VISIBLE,
  INDEX `FK4ahb89q64a67rw8v0r08kxddc` (`video_id` ASC) VISIBLE,
  CONSTRAINT `FK4ahb89q64a67rw8v0r08kxddc`
    FOREIGN KEY (`video_id`)
    REFERENCES `dahaeng`.`youtube_video` (`id`),
  CONSTRAINT `FKi8sc7mc5wyctg9n6hte4723fx`
    FOREIGN KEY (`account_id`)
    REFERENCES `dahaeng`.`youtube_account` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 486
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_playlist`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_playlist` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `account_id` BIGINT NOT NULL,
  `collected_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `youtube_playlist_id` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NULL DEFAULT NULL,
  `privacy_status` ENUM('PRIVATE', 'PUBLIC', 'UNLISTED') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UKdisogesdjsu0cgefu0hpodxq3` (`youtube_playlist_id` ASC) VISIBLE,
  INDEX `FKq6c907af9mntac8ryvmmtdlcw` (`account_id` ASC) VISIBLE,
  CONSTRAINT `FKq6c907af9mntac8ryvmmtdlcw`
    FOREIGN KEY (`account_id`)
    REFERENCES `dahaeng`.`youtube_account` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 21
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_playlist_video`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_playlist_video` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `position` INT NULL DEFAULT NULL,
  `collected_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `playlist_id` BIGINT NOT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `video_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKrn1pfh8daasvb6lc4oib60l7y` (`playlist_id` ASC) VISIBLE,
  INDEX `FK9l34o9vba7yjnpty0t0ck703g` (`video_id` ASC) VISIBLE,
  CONSTRAINT `FK9l34o9vba7yjnpty0t0ck703g`
    FOREIGN KEY (`video_id`)
    REFERENCES `dahaeng`.`youtube_video` (`id`),
  CONSTRAINT `FKrn1pfh8daasvb6lc4oib60l7y`
    FOREIGN KEY (`playlist_id`)
    REFERENCES `dahaeng`.`youtube_playlist` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 596
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_subscription`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_subscription` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `account_id` BIGINT NOT NULL,
  `collected_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `subscribed_at` DATETIME(6) NULL DEFAULT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `youtube_channel_id` VARCHAR(100) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `title` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKt0vgv4krp4jb43n6ylq2p8k2b` (`account_id` ASC) VISIBLE,
  CONSTRAINT `FKt0vgv4krp4jb43n6ylq2p8k2b`
    FOREIGN KEY (`account_id`)
    REFERENCES `dahaeng`.`youtube_account` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 722
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_sync_snapshot`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_sync_snapshot` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `account_id` BIGINT NOT NULL,
  `collected_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `raw_json` LONGTEXT NULL DEFAULT NULL,
  `snapshot_type` ENUM('FULL_SYNC', 'LIKED_VIDEOS', 'PLAYLISTS', 'PLAYLIST_ITEMS', 'SUBSCRIPTIONS', 'VIDEO_DETAILS') NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKheegm4icu8xwfw1xp6u2n4e2q` (`account_id` ASC) VISIBLE,
  CONSTRAINT `FKheegm4icu8xwfw1xp6u2n4e2q`
    FOREIGN KEY (`account_id`)
    REFERENCES `dahaeng`.`youtube_account` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 314
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_travel_tag`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_travel_tag` (
  `confidence` DOUBLE NOT NULL,
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `score` DOUBLE NOT NULL,
  `account_id` BIGINT NOT NULL,
  `analyzed_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tag_id` BIGINT NULL DEFAULT NULL,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `category_name` VARCHAR(50) NOT NULL,
  `tag_name` VARCHAR(50) NOT NULL,
  `reason` VARCHAR(500) NULL DEFAULT NULL,
  `evidence_keywords_json` TEXT NULL DEFAULT NULL,
  `source_badges_json` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKj2r1wxp0axyordteypksigcdy` (`account_id` ASC) VISIBLE,
  INDEX `FKaoyq3v6dnd4ijgnr1bvm4sicr` (`tag_id` ASC) VISIBLE,
  CONSTRAINT `FKaoyq3v6dnd4ijgnr1bvm4sicr`
    FOREIGN KEY (`tag_id`)
    REFERENCES `dahaeng`.`tag` (`id`),
  CONSTRAINT `FKj2r1wxp0axyordteypksigcdy`
    FOREIGN KEY (`account_id`)
    REFERENCES `dahaeng`.`youtube_account` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 157
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `dahaeng`.`youtube_video_tag`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dahaeng`.`youtube_video_tag` (
  `is_deleted` BIT(1) NULL DEFAULT NULL,
  `created_at` DATETIME(6) NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `updated_at` DATETIME(6) NULL DEFAULT NULL,
  `video_id` BIGINT NOT NULL,
  `tag_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `FKih01lu8mkutaai52dn24mswm7` (`video_id` ASC) VISIBLE,
  CONSTRAINT `FKih01lu8mkutaai52dn24mswm7`
    FOREIGN KEY (`video_id`)
    REFERENCES `dahaeng`.`youtube_video` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 12398
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;