"""Living cost crawling entry point."""

try:
    from livingcost.crawl_config import COUNTRIES_CITIES, TARGET_SCHEMA
    from livingcost.livingcost_verified_urls_with_countries import LIVINGCOST_URLS
    from livingcost.livingcost_crawler.runner import run_batch
except ModuleNotFoundError:
    from crawl_config import COUNTRIES_CITIES, TARGET_SCHEMA
    from livingcost_verified_urls_with_countries import LIVINGCOST_URLS
    from livingcost_crawler.runner import run_batch


if __name__ == "__main__":
    run_batch(
        countries_cities=COUNTRIES_CITIES,
        target_schema=TARGET_SCHEMA,
        verified_urls=LIVINGCOST_URLS,
        sleep_seconds=1.0,
    )
