"""Parse livingcost page tables into normalized payload."""

import re
from typing import Any, Dict, Optional

from .constants import ALIASES
from .text_utils import fuzzy_best, node_full_text, normalize_key, parse_price, strip_emoji_and_symbols


def _parse_compact_number(token: str) -> Optional[float]:
    token = token.strip().replace(",", "")
    if not token:
        return None

    multiplier = 1.0
    suffix = token[-1].lower()
    if suffix == "k":
        multiplier = 1_000.0
        token = token[:-1]
    elif suffix == "m":
        multiplier = 1_000_000.0
        token = token[:-1]
    elif suffix == "b":
        multiplier = 1_000_000_000.0
        token = token[:-1]

    try:
        return float(token) * multiplier
    except Exception:
        return None


def extract_overview_metrics(page) -> Dict[str, Optional[float]]:
    body_text = " ".join(t.strip() for t in page.css("body ::text").getall() if t and t.strip())
    body_text = re.sub(r"\s+", " ", body_text)
    body_lower = body_text.lower()

    label_map = {
        "without_rent": ["without rent"],
        "food": ["food"],
        "transport": ["transport"],
        "monthly_salary_after_tax": ["monthly salary after tax"],
        "population": ["population"],
    }

    metrics: Dict[str, Optional[float]] = {key: None for key in label_map.keys()}
    for key, labels in label_map.items():
        for label in labels:
            idx = body_lower.find(label)
            if idx == -1:
                continue

            window = body_text[idx : idx + 160]
            match = re.search(r"[-+]?\d[\d,]*\.?\d*[kKmMbB]?", window)
            if not match:
                continue

            parsed = _parse_compact_number(match.group(0))
            if parsed is not None:
                metrics[key] = parsed
                break

    return metrics


def extract_selected_prices_from_cost_page(fetcher, url: str, target_schema: Dict[str, Any]) -> Dict[str, Any]:
    page = fetcher.get(url)

    h1 = (page.css("h1::text").get() or "").strip()
    updated = page.css('header time[datetime]::attr(datetime)').get()

    scraped: Dict[str, Dict[str, Dict[str, Any]]] = {cat: {} for cat in target_schema.keys()}
    for table in page.css("table"):
        caption = (table.css("caption::text").get() or "").strip()
        caption = re.sub(r"\s+", " ", caption)
        if caption not in scraped:
            continue

        for row in table.css("tbody tr"):
            ths = row.css("th")
            tds = row.css("td")
            if not ths or not tds:
                continue

            raw_item = strip_emoji_and_symbols(node_full_text(ths[0]))
            item_key = normalize_key(raw_item)
            usd, _ = parse_price(tds[0])
            scraped[caption][item_key] = {"raw_item": raw_item, "usd": usd}

    result: Dict[str, Any] = {
        "url": url,
        "page_title": h1,
        "updated": updated,
        "overview": extract_overview_metrics(page),
        "data": {},
        "debug": {"unmatched": []},
    }

    for category, targets in target_schema.items():
        result["data"][category] = []
        candidate_keys = list(scraped[category].keys())

        for target in targets:
            alias_list = ALIASES.get(target, [target])
            target_keys = [normalize_key(alias) for alias in alias_list]

            matched_key = None
            for target_key in target_keys:
                if target_key in scraped[category]:
                    matched_key = target_key
                    break
            if not matched_key:
                matched_key = fuzzy_best(target_keys[0], candidate_keys, min_ratio=0.78)

            if not matched_key:
                result["data"][category].append({"item": target, "usd": None})
                result["debug"]["unmatched"].append({"category": category, "target": target})
                continue

            info = scraped[category][matched_key]
            result["data"][category].append({"item": target, "usd": info["usd"]})

    return result
