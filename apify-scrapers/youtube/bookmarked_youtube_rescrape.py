#!/usr/bin/env python3
import os
import time
import random
import requests
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

# Reuse parsing + Apify runner from existing YouTube scraper
import ingest_trending_youtube as yt

load_dotenv()


# -----------------------
# Env
# -----------------------
def must_env(k: str) -> str:
    v = os.getenv(k)
    if not v:
        raise RuntimeError(f"Missing env var: {k}")
    return v.strip()


def env_int(k: str, default: int) -> int:
    v = os.getenv(k)
    return int(v) if v and v.strip() else default


def env_float(k: str, default: float) -> float:
    v = os.getenv(k)
    return float(v) if v and v.strip() else default


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def iso_to_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


APIFY_TOKEN = must_env("APIFY_TOKEN")
SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

BOOKMARK_REFRESH_HOURS = env_int("BOOKMARK_REFRESH_HOURS", 12)
BATCH_SIZE = env_int("BOOKMARK_BATCH_SIZE", 50)
MAX_PER_RUN = env_int("BOOKMARK_MAX_PER_RUN", 500)
SLEEP_BETWEEN = env_float("BOOKMARK_SLEEP_SECONDS", 1.0)


# -----------------------
# Supabase REST helpers
# -----------------------
def sb_headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def sb_get(
    table: str, params: Dict[str, str], range_from: int, range_to: int
) -> List[Dict[str, Any]]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = sb_headers()
    headers["Range"] = f"{range_from}-{range_to}"
    r = requests.get(url, headers=headers, params=params, timeout=60)
    if not r.ok:
        raise RuntimeError(f"GET {table} failed: {r.status_code} {r.text[:300]}")
    return r.json()


def sb_patch(table: str, params: Dict[str, str], payload: Dict[str, Any]) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.patch(url, headers=sb_headers(), params=params, json=payload, timeout=60)
    if not r.ok:
        raise RuntimeError(f"PATCH {table} failed: {r.status_code} {r.text[:300]}")


def sb_upsert(table: str, rows: List[Dict[str, Any]], on_conflict: str) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = sb_headers()
    headers["Prefer"] = "resolution=merge-duplicates"
    params = {"on_conflict": on_conflict}
    r = requests.post(url, headers=headers, params=params, json=rows, timeout=60)
    if not r.ok:
        raise RuntimeError(f"UPSERT {table} failed: {r.status_code} {r.text[:300]}")


# -----------------------
# Main
# -----------------------
def should_rescrape(last_scraped: Optional[str]) -> bool:
    last_dt = iso_to_dt(last_scraped)
    if not last_dt:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(hours=BOOKMARK_REFRESH_HOURS)
    return last_dt < cutoff


def main() -> None:
    total_processed = 0
    offset = 0

    while total_processed < MAX_PER_RUN:
        rows = sb_get(
            "sns_accounts",
            {
                "select": "id,platform,account_name,account_url,last_profile_scraped_at,bookmarks",
                "platform": "eq.youtube",
                "and": "(bookmarks.not.is.null,bookmarks.not.eq.{})",
                "order": "id.asc",
                "limit": str(BATCH_SIZE),
                "offset": str(offset),
            },
            range_from=offset,
            range_to=offset + BATCH_SIZE - 1,
        )

        if not rows:
            break

        for row in rows:
            if total_processed >= MAX_PER_RUN:
                break

            if not should_rescrape(row.get("last_profile_scraped_at")):
                continue

            channel_url = row.get("account_url") or ""
            if not channel_url:
                channel_key = row.get("account_name")
                if channel_key:
                    channel_url = f"https://www.youtube.com/@{channel_key}"
            if not channel_url:
                continue

            items = yt.apify_run_youtube(
                {
                    "startUrls": [{"url": channel_url}],
                    "maxResults": 1,
                    "maxResultsShorts": 0,
                    "maxResultStreams": 0,
                    "sortingOrder": "date",
                }
            )
            if not items:
                continue

            channel = yt.parse_channel_from_item(items[0])
            if not channel:
                continue

            now_iso = utcnow_iso()
            account_id = row["id"]

            sb_patch(
                "sns_accounts",
                {"id": f"eq.{account_id}"},
                {
                    "account_name": channel.get("account_name") or row.get("account_name"),
                    "account_url": channel.get("account_url") or channel_url,
                    "caption": channel.get("caption"),
                    "profile_image_url": channel.get("profile_image_url"),
                    "is_verified": channel.get("is_verified"),
                    "last_profile_scraped_at": now_iso,
                    "updated_at": now_iso,
                },
            )

            sb_upsert(
                "accounts_metrics",
                [
                    {
                        "account_id": account_id,
                        "metric_date": datetime.now(timezone.utc).date().isoformat(),
                        "followers": channel.get("followers"),
                        "following": None,
                        "posts": channel.get("posts"),
                        "maximum_likes": channel.get("maximum_likes"),
                        "created_at": now_iso,
                    }
                ],
                on_conflict="account_id,metric_date",
            )

            total_processed += 1
            time.sleep(SLEEP_BETWEEN + random.uniform(0, 0.3))

        offset += BATCH_SIZE

    print(f"Done. Updated {total_processed} bookmarked YouTube accounts.")


if __name__ == "__main__":
    main()
