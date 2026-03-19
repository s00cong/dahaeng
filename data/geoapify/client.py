"""Geoapify Places API client."""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request


def _base_url() -> str:
    return os.getenv("GEOAPIFY_BASE_URL", "https://api.geoapify.com").rstrip("/")


def _api_key() -> str:
    api_key = os.getenv("GEOAPIFY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEOAPIFY_API_KEY must be set before calling Geoapify.")
    return api_key


def fetch_places(*, lon, lat, category, radius_meters, limit, timeout=30):
    """Fetch raw JSON payload from Geoapify Places API."""
    params = {
        "categories": category,
        "filter": f"circle:{lon},{lat},{radius_meters}",
        "limit": str(limit),
        "apiKey": _api_key(),
    }
    url = f"{_base_url()}/v2/places?{urllib.parse.urlencode(params)}"

    with urllib.request.urlopen(url, timeout=timeout) as response:
        charset = response.headers.get_content_charset("utf-8")
        body = response.read().decode(charset)
        return json.loads(body)
