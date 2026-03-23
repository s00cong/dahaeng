-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: dahaeng
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bookmark`
--

DROP TABLE IF EXISTS `bookmark`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookmark` (
  `is_deleted` bit(1) DEFAULT NULL,
  `city_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `json` text,
  PRIMARY KEY (`id`),
  KEY `FKne2a5hh2hcvrhtx8vyqybg3tx` (`city_id`),
  KEY `FK5bm7rup91j277mc7gg63akie2` (`member_id`),
  CONSTRAINT `FK5bm7rup91j277mc7gg63akie2` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`),
  CONSTRAINT `FKne2a5hh2hcvrhtx8vyqybg3tx` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookmark`
--

LOCK TABLES `bookmark` WRITE;
/*!40000 ALTER TABLE `bookmark` DISABLE KEYS */;
/*!40000 ALTER TABLE `bookmark` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `is_deleted` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `name` varchar(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `city`
--

DROP TABLE IF EXISTS `city`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `city` (
  `is_deleted` bit(1) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lon` double DEFAULT NULL,
  `news_penalty_score` double DEFAULT NULL,
  `country_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `city_name` varchar(50) DEFAULT NULL,
  `description` text,
  `img_url` text,
  PRIMARY KEY (`id`),
  KEY `FKrpd7j1p7yxr784adkx4pyepba` (`country_id`),
  CONSTRAINT `FKrpd7j1p7yxr784adkx4pyepba` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `city`
--

LOCK TABLES `city` WRITE;
/*!40000 ALTER TABLE `city` DISABLE KEYS */;
/*!40000 ALTER TABLE `city` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `city_climate_tag`
--

DROP TABLE IF EXISTS `city_climate_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `city_climate_tag` (
  `is_deleted` bit(1) DEFAULT NULL,
  `city_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `month` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKre0ncobp35c8g6kf8i1dwrxya` (`city_id`),
  KEY `FKp4s9itmv6vtimot6q8y13w0sh` (`tag_id`),
  CONSTRAINT `FKp4s9itmv6vtimot6q8y13w0sh` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`),
  CONSTRAINT `FKre0ncobp35c8g6kf8i1dwrxya` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `city_climate_tag`
--

LOCK TABLES `city_climate_tag` WRITE;
/*!40000 ALTER TABLE `city_climate_tag` DISABLE KEYS */;
/*!40000 ALTER TABLE `city_climate_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `city_tag`
--

DROP TABLE IF EXISTS `city_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `city_tag` (
  `is_deleted` bit(1) DEFAULT NULL,
  `tag_score` double DEFAULT NULL,
  `city_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tag_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKb4y91h6i2qx3i40su2lrncf0p` (`city_id`),
  KEY `FKbq0h6344yr2jbera7hhpqj6wi` (`tag_id`),
  CONSTRAINT `FKb4y91h6i2qx3i40su2lrncf0p` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`),
  CONSTRAINT `FKbq0h6344yr2jbera7hhpqj6wi` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `city_tag`
--

LOCK TABLES `city_tag` WRITE;
/*!40000 ALTER TABLE `city_tag` DISABLE KEYS */;
/*!40000 ALTER TABLE `city_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `city_view_history`
--

DROP TABLE IF EXISTS `city_view_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `city_view_history` (
  `is_deleted` bit(1) DEFAULT NULL,
  `city_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKf2jutgs69tt63aixeir1oawap` (`city_id`),
  KEY `FK61n401r2k5o3a775iwavyrax2` (`member_id`),
  CONSTRAINT `FK61n401r2k5o3a775iwavyrax2` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`),
  CONSTRAINT `FKf2jutgs69tt63aixeir1oawap` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `city_view_history`
--

LOCK TABLES `city_view_history` WRITE;
/*!40000 ALTER TABLE `city_view_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `city_view_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `climate`
--

DROP TABLE IF EXISTS `climate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `climate` (
  `humidity` double DEFAULT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `month` int DEFAULT NULL,
  `precipitation` double DEFAULT NULL,
  `snowfall` double DEFAULT NULL,
  `temperature` double DEFAULT NULL,
  `city_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK4b16l3lvhq3oiu7otc3yysx1d` (`city_id`),
  CONSTRAINT `FK4b16l3lvhq3oiu7otc3yysx1d` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `climate`
--

LOCK TABLES `climate` WRITE;
/*!40000 ALTER TABLE `climate` DISABLE KEYS */;
/*!40000 ALTER TABLE `climate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `country`
--

DROP TABLE IF EXISTS `country`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `country` (
  `is_deleted` bit(1) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lon` double DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `country_name` varchar(50) DEFAULT NULL,
  `img_url` text,
  `continent` enum('AFRICA','ASIA','EUROPE','NORTH_AMERICA','OCEANIA','SOUTH_AMERICA') DEFAULT NULL,
  `currency` enum('AED','ARS','AUD','BOB','BRL','CAD','CHF','CLP','CNY','CUP','CZK','DKK','EGP','EUR','GBP','HKD','HUF','IDR','INR','ISK','JPY','KES','KHR','KRW','KZT','LAK','MAD','MNT','MOP','MUR','MVR','MXN','MYR','NOK','NPR','NZD','PEN','PHP','PLN','QAR','RUB','SEK','SGD','THB','TRY','TWD','USD','VND','ZAR') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `country`
--

LOCK TABLES `country` WRITE;
/*!40000 ALTER TABLE `country` DISABLE KEYS */;
/*!40000 ALTER TABLE `country` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `country_top`
--

DROP TABLE IF EXISTS `country_top`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `country_top` (
  `is_deleted` bit(1) DEFAULT NULL,
  `ranking` int DEFAULT NULL,
  `country_id` bigint DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKevtn4su91b87lnfma0va6wjxo` (`country_id`),
  CONSTRAINT `FKevtn4su91b87lnfma0va6wjxo` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `country_top`
--

LOCK TABLES `country_top` WRITE;
/*!40000 ALTER TABLE `country_top` DISABLE KEYS */;
/*!40000 ALTER TABLE `country_top` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `danger`
--

DROP TABLE IF EXISTS `danger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `danger` (
  `is_deleted` bit(1) DEFAULT NULL,
  `country_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `attention` varchar(10) DEFAULT NULL,
  `control` varchar(10) DEFAULT NULL,
  `limita` varchar(10) DEFAULT NULL,
  `country_name` varchar(20) DEFAULT NULL,
  `country_en_name` varchar(100) DEFAULT NULL,
  `attention_note` varchar(255) DEFAULT NULL,
  `attention_partial` varchar(255) DEFAULT NULL,
  `ban_note` varchar(255) DEFAULT NULL,
  `ban_yn_partial` varchar(255) DEFAULT NULL,
  `ban_yna` varchar(255) DEFAULT NULL,
  `control_note` varchar(255) DEFAULT NULL,
  `control_partial` varchar(255) DEFAULT NULL,
  `evacuate_rcmnd_remark` varchar(255) DEFAULT NULL,
  `evacuate_region_ty` varchar(255) DEFAULT NULL,
  `forbidden__region_ty` varchar(255) DEFAULT NULL,
  `forbidden_rcmnd_remark` varchar(255) DEFAULT NULL,
  `limita_note` varchar(255) DEFAULT NULL,
  `limita_partial` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKonw5f3hfp05f1t2volqfh83m7` (`country_id`),
  CONSTRAINT `FKonw5f3hfp05f1t2volqfh83m7` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danger`
--

LOCK TABLES `danger` WRITE;
/*!40000 ALTER TABLE `danger` DISABLE KEYS */;
/*!40000 ALTER TABLE `danger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchanges`
--

DROP TABLE IF EXISTS `exchanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exchanges` (
  `display_unit` int DEFAULT NULL,
  `event_date` date DEFAULT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `krw_per_1cur` double DEFAULT NULL,
  `krw_per_display_unit` double DEFAULT NULL,
  `rate_1krw_to_cur` double DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `display_symbol` varchar(15) DEFAULT NULL,
  `currency` enum('AED','ARS','AUD','BOB','BRL','CAD','CHF','CLP','CNY','CUP','CZK','DKK','EGP','EUR','GBP','HKD','HUF','IDR','INR','ISK','JPY','KES','KHR','KRW','KZT','LAK','MAD','MNT','MOP','MUR','MVR','MXN','MYR','NOK','NPR','NZD','PEN','PHP','PLN','QAR','RUB','SEK','SGD','THB','TRY','TWD','USD','VND','ZAR') DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchanges`
--

LOCK TABLES `exchanges` WRITE;
/*!40000 ALTER TABLE `exchanges` DISABLE KEYS */;
/*!40000 ALTER TABLE `exchanges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flight_summary`
--

DROP TABLE IF EXISTS `flight_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flight_summary` (
  `avg_flight_price` int DEFAULT NULL,
  `avg_hotel_price` int DEFAULT NULL,
  `flight_duration` int DEFAULT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `stops` int DEFAULT NULL,
  `city_id` bigint DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `flight_collected_date` datetime(6) DEFAULT NULL,
  `hotel_collected_date` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `off_month_list` varchar(255) DEFAULT NULL,
  `origin_airport` varchar(255) DEFAULT NULL,
  `peak_month_list` varchar(255) DEFAULT NULL,
  `target_year_month` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_city_year_month` (`city_id`,`target_year_month`),
  CONSTRAINT `FK6wrusyjwbdhhnsp9xkarbma53` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flight_summary`
--

LOCK TABLES `flight_summary` WRITE;
/*!40000 ALTER TABLE `flight_summary` DISABLE KEYS */;
/*!40000 ALTER TABLE `flight_summary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `living_cost_of_city`
--

DROP TABLE IF EXISTS `living_cost_of_city`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `living_cost_of_city` (
  `apple` double DEFAULT NULL,
  `banana` double DEFAULT NULL,
  `beer` double DEFAULT NULL,
  `beer_in_a_pub` double DEFAULT NULL,
  `brand_jeans` double DEFAULT NULL,
  `brand_sneakers` double DEFAULT NULL,
  `bread` double DEFAULT NULL,
  `cappuccino` double DEFAULT NULL,
  `chicken` double DEFAULT NULL,
  `cigarette` double DEFAULT NULL,
  `cinema_ticket` double DEFAULT NULL,
  `coke` double DEFAULT NULL,
  `coke_pepsi` double DEFAULT NULL,
  `cold_medicine` double DEFAULT NULL,
  `daily_budget` double DEFAULT NULL,
  `dinner_in_a_resturant_for_2` double DEFAULT NULL,
  `egg` double DEFAULT NULL,
  `fast_food_meal` double DEFAULT NULL,
  `food` double NOT NULL,
  `gas_petrol` double DEFAULT NULL,
  `gym_month` double DEFAULT NULL,
  `haircut` double DEFAULT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `local_transport_ticket` double DEFAULT NULL,
  `lunch_menu` double NOT NULL,
  `milk` double DEFAULT NULL,
  `monthly_salary_after_tax` double DEFAULT NULL,
  `monthly_ticket_local_transport` double DEFAULT NULL,
  `onion` double DEFAULT NULL,
  `orange` double DEFAULT NULL,
  `population` double NOT NULL,
  `potato` double DEFAULT NULL,
  `rice` double DEFAULT NULL,
  `shampoo` double DEFAULT NULL,
  `steak` double DEFAULT NULL,
  `taxi_ride` double DEFAULT NULL,
  `toilet_paper` double DEFAULT NULL,
  `tomato` double DEFAULT NULL,
  `toothpaste` double DEFAULT NULL,
  `transport` double NOT NULL,
  `water` double DEFAULT NULL,
  `wine` double DEFAULT NULL,
  `without_rent` double NOT NULL,
  `city_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKis009rqdjmen4mb8bjoqwv6wq` (`city_id`),
  CONSTRAINT `FKis009rqdjmen4mb8bjoqwv6wq` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `living_cost_of_city`
--

LOCK TABLES `living_cost_of_city` WRITE;
/*!40000 ALTER TABLE `living_cost_of_city` DISABLE KEYS */;
/*!40000 ALTER TABLE `living_cost_of_city` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `living_cost_of_country`
--

DROP TABLE IF EXISTS `living_cost_of_country`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `living_cost_of_country` (
  `apple` double DEFAULT NULL,
  `banana` double DEFAULT NULL,
  `beer` double DEFAULT NULL,
  `beer_in_a_pub` double DEFAULT NULL,
  `brand_jeans` double DEFAULT NULL,
  `brand_sneakers` double DEFAULT NULL,
  `bread` double DEFAULT NULL,
  `cappuccino` double DEFAULT NULL,
  `chicken` double DEFAULT NULL,
  `cigarette` double DEFAULT NULL,
  `cinema_ticket` double DEFAULT NULL,
  `coke` double DEFAULT NULL,
  `coke_pepsi` double DEFAULT NULL,
  `cold_medicine` double DEFAULT NULL,
  `daily_budget` double DEFAULT NULL,
  `dinner_in_a_resturant_for_2` double DEFAULT NULL,
  `egg` double DEFAULT NULL,
  `fast_food_meal` double DEFAULT NULL,
  `food` double DEFAULT NULL,
  `gas_petrol` double DEFAULT NULL,
  `gym_month` double DEFAULT NULL,
  `haircut` double DEFAULT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `local_transport_ticket` double DEFAULT NULL,
  `lunch_menu` double DEFAULT NULL,
  `milk` double DEFAULT NULL,
  `monthly_salary_after_tax` double DEFAULT NULL,
  `monthly_ticket_local_transport` double DEFAULT NULL,
  `onion` double DEFAULT NULL,
  `orange` double DEFAULT NULL,
  `population` double DEFAULT NULL,
  `potato` double DEFAULT NULL,
  `rice` double DEFAULT NULL,
  `shampoo` double DEFAULT NULL,
  `steak` double DEFAULT NULL,
  `taxi_ride` double DEFAULT NULL,
  `toilet_paper` double DEFAULT NULL,
  `tomato` double DEFAULT NULL,
  `toothpaste` double DEFAULT NULL,
  `transport` double DEFAULT NULL,
  `water` double DEFAULT NULL,
  `wine` double DEFAULT NULL,
  `without_rent` double DEFAULT NULL,
  `country_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK1ijl0vpfaaitwkr3lai02iye3` (`country_id`),
  CONSTRAINT `FK1ijl0vpfaaitwkr3lai02iye3` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `living_cost_of_country`
--

LOCK TABLES `living_cost_of_country` WRITE;
/*!40000 ALTER TABLE `living_cost_of_country` DISABLE KEYS */;
/*!40000 ALTER TABLE `living_cost_of_country` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `member`
--

DROP TABLE IF EXISTS `member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member` (
  `is_deleted` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `role` varchar(20) NOT NULL,
  `nickname` varchar(50) NOT NULL,
  `social_id` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `profileImageUrl` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member`
--

LOCK TABLES `member` WRITE;
/*!40000 ALTER TABLE `member` DISABLE KEYS */;
/*!40000 ALTER TABLE `member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `member_tag`
--

DROP TABLE IF EXISTS `member_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_tag` (
  `is_deleted` bit(1) DEFAULT NULL,
  `is_from_youtube` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKgodbg35wb92j09pt5pi64udco` (`member_id`),
  KEY `FKcg8t5r0fghpy478wylesc2sfj` (`tag_id`),
  CONSTRAINT `FKcg8t5r0fghpy478wylesc2sfj` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`),
  CONSTRAINT `FKgodbg35wb92j09pt5pi64udco` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member_tag`
--

LOCK TABLES `member_tag` WRITE;
/*!40000 ALTER TABLE `member_tag` DISABLE KEYS */;
/*!40000 ALTER TABLE `member_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `spot_tags`
--

DROP TABLE IF EXISTS `spot_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `spot_tags` (
  `is_deleted` bit(1) DEFAULT NULL,
  `score` double NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tag_id` bigint NOT NULL,
  `tourist_spot_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKmtduti60ub98oolsjtn1denmw` (`tag_id`),
  KEY `FK7p6ftuklgcvinq5i622e51ml7` (`tourist_spot_id`),
  CONSTRAINT `FK7p6ftuklgcvinq5i622e51ml7` FOREIGN KEY (`tourist_spot_id`) REFERENCES `tourist_spot` (`id`),
  CONSTRAINT `FKmtduti60ub98oolsjtn1denmw` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `spot_tags`
--

LOCK TABLES `spot_tags` WRITE;
/*!40000 ALTER TABLE `spot_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `spot_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tag`
--

DROP TABLE IF EXISTS `tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tag` (
  `is_deleted` bit(1) DEFAULT NULL,
  `category_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `name` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKruoloyh4bf4kdko2ccv18xyyx` (`category_id`),
  CONSTRAINT `FKruoloyh4bf4kdko2ccv18xyyx` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tag`
--

LOCK TABLES `tag` WRITE;
/*!40000 ALTER TABLE `tag` DISABLE KEYS */;
/*!40000 ALTER TABLE `tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tourist_spot`
--

DROP TABLE IF EXISTS `tourist_spot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tourist_spot` (
  `is_deleted` bit(1) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lon` double DEFAULT NULL,
  `city_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `tourist_name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  KEY `FKeej4nk6ufih18jd8mghfn8pte` (`city_id`),
  CONSTRAINT `FKeej4nk6ufih18jd8mghfn8pte` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tourist_spot`
--

LOCK TABLES `tourist_spot` WRITE;
/*!40000 ALTER TABLE `tourist_spot` DISABLE KEYS */;
/*!40000 ALTER TABLE `tourist_spot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_account`
--

DROP TABLE IF EXISTS `youtube_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_account` (
  `is_deleted` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `last_synced_at` datetime(6) DEFAULT NULL,
  `member_id` bigint NOT NULL,
  `token_expires_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `google_email` varchar(100) DEFAULT NULL,
  `youtube_channel_id` varchar(100) DEFAULT NULL,
  `access_token` text,
  `refresh_token` text,
  `sync_status` enum('FAILED','PENDING','SYNCED') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKhllxgbjwxgs3u9lf1lcg2rjvi` (`member_id`),
  UNIQUE KEY `UK25xup9me24hsm95wqbtcsaggi` (`youtube_channel_id`),
  CONSTRAINT `FKg7vwu4nh97fjdgloycvq67mbh` FOREIGN KEY (`member_id`) REFERENCES `member` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_account`
--

LOCK TABLES `youtube_account` WRITE;
/*!40000 ALTER TABLE `youtube_account` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_account` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_interest_keyword`
--

DROP TABLE IF EXISTS `youtube_interest_keyword`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_interest_keyword` (
  `is_deleted` bit(1) DEFAULT NULL,
  `score` double NOT NULL,
  `account_id` bigint NOT NULL,
  `analyzed_at` datetime(6) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `keyword` varchar(100) NOT NULL,
  `normalized_keyword` varchar(100) DEFAULT NULL,
  `source_type` enum('LIKED_VIDEO_TAG','LIKED_VIDEO_TITLE','PLAYLIST_TITLE','PLAYLIST_VIDEO_TAG','PLAYLIST_VIDEO_TITLE','SUBSCRIPTION_TITLE') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKl5ido3f6fes3vj684up6kcxaf` (`account_id`),
  CONSTRAINT `FKl5ido3f6fes3vj684up6kcxaf` FOREIGN KEY (`account_id`) REFERENCES `youtube_account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_interest_keyword`
--

LOCK TABLES `youtube_interest_keyword` WRITE;
/*!40000 ALTER TABLE `youtube_interest_keyword` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_interest_keyword` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_liked_video`
--

DROP TABLE IF EXISTS `youtube_liked_video`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_liked_video` (
  `is_deleted` bit(1) DEFAULT NULL,
  `account_id` bigint NOT NULL,
  `collected_at` datetime(6) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `liked_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `video_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKi8sc7mc5wyctg9n6hte4723fx` (`account_id`),
  KEY `FK4ahb89q64a67rw8v0r08kxddc` (`video_id`),
  CONSTRAINT `FK4ahb89q64a67rw8v0r08kxddc` FOREIGN KEY (`video_id`) REFERENCES `youtube_video` (`id`),
  CONSTRAINT `FKi8sc7mc5wyctg9n6hte4723fx` FOREIGN KEY (`account_id`) REFERENCES `youtube_account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_liked_video`
--

LOCK TABLES `youtube_liked_video` WRITE;
/*!40000 ALTER TABLE `youtube_liked_video` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_liked_video` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_playlist`
--

DROP TABLE IF EXISTS `youtube_playlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_playlist` (
  `is_deleted` bit(1) DEFAULT NULL,
  `account_id` bigint NOT NULL,
  `collected_at` datetime(6) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `youtube_playlist_id` varchar(100) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `privacy_status` enum('PRIVATE','PUBLIC','UNLISTED') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKdisogesdjsu0cgefu0hpodxq3` (`youtube_playlist_id`),
  KEY `FKq6c907af9mntac8ryvmmtdlcw` (`account_id`),
  CONSTRAINT `FKq6c907af9mntac8ryvmmtdlcw` FOREIGN KEY (`account_id`) REFERENCES `youtube_account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_playlist`
--

LOCK TABLES `youtube_playlist` WRITE;
/*!40000 ALTER TABLE `youtube_playlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_playlist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_playlist_video`
--

DROP TABLE IF EXISTS `youtube_playlist_video`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_playlist_video` (
  `is_deleted` bit(1) DEFAULT NULL,
  `position` int DEFAULT NULL,
  `collected_at` datetime(6) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `playlist_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `video_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKrn1pfh8daasvb6lc4oib60l7y` (`playlist_id`),
  KEY `FK9l34o9vba7yjnpty0t0ck703g` (`video_id`),
  CONSTRAINT `FK9l34o9vba7yjnpty0t0ck703g` FOREIGN KEY (`video_id`) REFERENCES `youtube_video` (`id`),
  CONSTRAINT `FKrn1pfh8daasvb6lc4oib60l7y` FOREIGN KEY (`playlist_id`) REFERENCES `youtube_playlist` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_playlist_video`
--

LOCK TABLES `youtube_playlist_video` WRITE;
/*!40000 ALTER TABLE `youtube_playlist_video` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_playlist_video` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_subscription`
--

DROP TABLE IF EXISTS `youtube_subscription`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_subscription` (
  `is_deleted` bit(1) DEFAULT NULL,
  `account_id` bigint NOT NULL,
  `collected_at` datetime(6) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `subscribed_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `youtube_channel_id` varchar(100) NOT NULL,
  `description` text,
  `title` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKt0vgv4krp4jb43n6ylq2p8k2b` (`account_id`),
  CONSTRAINT `FKt0vgv4krp4jb43n6ylq2p8k2b` FOREIGN KEY (`account_id`) REFERENCES `youtube_account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_subscription`
--

LOCK TABLES `youtube_subscription` WRITE;
/*!40000 ALTER TABLE `youtube_subscription` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_subscription` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_sync_snapshot`
--

DROP TABLE IF EXISTS `youtube_sync_snapshot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_sync_snapshot` (
  `is_deleted` bit(1) DEFAULT NULL,
  `account_id` bigint NOT NULL,
  `collected_at` datetime(6) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `raw_json` longtext,
  `snapshot_type` enum('FULL_SYNC','LIKED_VIDEOS','PLAYLISTS','PLAYLIST_ITEMS','SUBSCRIPTIONS','VIDEO_DETAILS') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKheegm4icu8xwfw1xp6u2n4e2q` (`account_id`),
  CONSTRAINT `FKheegm4icu8xwfw1xp6u2n4e2q` FOREIGN KEY (`account_id`) REFERENCES `youtube_account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_sync_snapshot`
--

LOCK TABLES `youtube_sync_snapshot` WRITE;
/*!40000 ALTER TABLE `youtube_sync_snapshot` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_sync_snapshot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_travel_tag`
--

DROP TABLE IF EXISTS `youtube_travel_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_travel_tag` (
  `confidence` double NOT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `score` double NOT NULL,
  `account_id` bigint NOT NULL,
  `analyzed_at` datetime(6) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `category_name` varchar(50) NOT NULL,
  `tag_name` varchar(50) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKj2r1wxp0axyordteypksigcdy` (`account_id`),
  CONSTRAINT `FKj2r1wxp0axyordteypksigcdy` FOREIGN KEY (`account_id`) REFERENCES `youtube_account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_travel_tag`
--

LOCK TABLES `youtube_travel_tag` WRITE;
/*!40000 ALTER TABLE `youtube_travel_tag` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_travel_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_video`
--

DROP TABLE IF EXISTS `youtube_video`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_video` (
  `is_deleted` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `category_id` varchar(20) DEFAULT NULL,
  `youtube_video_id` varchar(50) NOT NULL,
  `channel_title` varchar(100) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK40wap4enj5jyfoq8l7mh66nlv` (`youtube_video_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_video`
--

LOCK TABLES `youtube_video` WRITE;
/*!40000 ALTER TABLE `youtube_video` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_video` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_video_tag`
--

DROP TABLE IF EXISTS `youtube_video_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_video_tag` (
  `is_deleted` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `video_id` bigint NOT NULL,
  `tag_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKih01lu8mkutaai52dn24mswm7` (`video_id`),
  CONSTRAINT `FKih01lu8mkutaai52dn24mswm7` FOREIGN KEY (`video_id`) REFERENCES `youtube_video` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_video_tag`
--

LOCK TABLES `youtube_video_tag` WRITE;
/*!40000 ALTER TABLE `youtube_video_tag` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_video_tag` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-14 16:34:39
