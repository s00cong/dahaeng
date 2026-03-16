# AI KNOWLEDGE BASE

## OVERVIEW
AI directory is a data-pipeline workspace: Trip.com and Google Flights scrapers feed Bronze JSONL, Spark jobs build Silver datasets, and docs capture pipeline intent and mapping rules.

## STRUCTURE
```text
data/
├── trip_com/       # source crawler + city/airport mapping generation
├── google_flight/  # source crawler + recrawl/manual retry tooling
├── spark_pipeline/ # Bronze -> Silver / DB ETL scripts
├── silver/         # checked-in Silver parquet artifacts
└── docs/           # architecture, column, storage, mapping docs
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Trip.com source crawl | `trip_com/trip_scraper.py` | route-based crawl with checkpointing |
| Mapping generation | `trip_com/update_mapping.py` | produces `city_airport_mapping.json` |
| Google Flights source crawl | `google_flight/google_flight_scraper.py` | active hotspot and retry logic |
| Missing/recrawl utilities | `google_flight/find_missing_and_empty.py`, `google_flight/recrawl_from_targets.py` | targeted reruns |
| Flight ETL | `spark_pipeline/bronze_to_silver_flight.py` | Silver Parquet + MariaDB upsert |
| Calendar ETL | `spark_pipeline/bronze_to_silver_calendar.py` | Mongo calendar build |
| Pipeline design docs | `docs/` | architecture, mapping, columns, Hadoop/Spark notes |

## CONVENTIONS
- Script-first layout: multiple CLI entrypoints with `if __name__ == "__main__"`, not a packaged Python service.
- Raw outputs are Bronze JSONL under scraper-specific folders; downstream canonicalization happens in Spark scripts.
- Mapping table is central: `trip_com/city_airport_mapping.json` feeds downstream Google Flights behavior.
- Current raw schemas are not fully unified across crawlers; expect per-pipeline differences.

## CURRENT STATUS
- Silver output exists: `silver/_SUCCESS` shows Spark write success.
- Google Flights has active merge/retry tooling and manual retry notes under `google_flight/`.
- Docs show the intended architecture is Bronze -> Silver -> MySQL/MongoDB.

## ANTI-PATTERNS
- Do not treat checked-in Bronze/Silver data as source-controlled truth; they are runtime artifacts.
- `trip_com/update_mapping.py` uses Windows-specific absolute output paths; avoid copying that pattern.
- `.temp` docs/scripts under `docs/.temp` are historical references, not the main implementation path.

## COMMANDS
```bash
python trip_com/trip_scraper.py
python google_flight/google_flight_scraper.py
python spark_pipeline/bronze_to_silver_flight.py --help
python spark_pipeline/bronze_to_silver_calendar.py --help
```

## NOTES
- `data/README.md` is empty; use docs and source files as truth.
- Main active operational concern is Google Flights data quality and retry completion under `google_flight`.

