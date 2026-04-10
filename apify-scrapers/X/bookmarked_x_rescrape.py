#!/usr/bin/env python3
import os
import time
import random
import requests
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

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
# Apify: apidojo~tweet-scraper
# -----------------------
def apify_run(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = "https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items"
    r = requests.post(url, params={"token": APIFY_TOKEN, "clean": "true"}, json=payload, timeout=300)
    if not r.ok:
        raise RuntimeError(f"Apify error {r.status_code}: {r.text[:1200]}")
    data = r.json()
    return data if isinstance(data, list) else []


def first(d: Dict[str, Any], *keys: str) -> Any:
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


def safe_int(v: Any, default: int = 0) -> int:
    try:
        return int(v)
    except Exception:
        return default


def parse_author(raw_tweet: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    a = raw_tweet.get("author")
    if not isinstance(a, dict):
        return None

    username = first(a, "userName", "username", "screenName", "handle")
    if not username:
        return None
    username = str(username).lstrip("@")

    display_name = first(a, "name", "displayName", "display_name", "fullName", "full_name")

    avatar = first(
        a,
        "profilePicture",
        "profilePictureUrl",
        "profileImageUrl",
        "profileImage",
        "avatar",
        "imageUrl",
        "profile_image_url",
        "profile_image",
    )
    if isinstance(avatar, dict):
        avatar = first(avatar, "url", "imageUrl", "src")
    profile_image_url = str(avatar).strip() if avatar else None

    verified = first(a, "isVerified", "verified", "isBlueVerified")

    return {
        "account_name": username,
        "display_name": display_name,
        "account_url": f"https://x.com/{username}",
        "caption": first(a, "description", "bio"),
        "profile_image_url": profile_image_url,
        "is_verified": bool(verified) if verified is not None else None,
        "followers": safe_int(first(a, "followersCount", "followers"), 0),
        "following": safe_int(first(a, "friendsCount", "following"), 0),
        "posts": safe_int(first(a, "mediaCount", "statusesCount", "posts"), 0),
        "maximum_likes": safe_int(first(a, "likeCount", "likes"), 0),
    }


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
                "select": "id,platform,account_name,last_profile_scraped_at,bookmarks",
                "platform": "eq.x",
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

            username = str(row.get("account_name") or "").lstrip("@")
            if not username:
                continue

            items = apify_run({"twitterHandles": [username], "maxItems": 1, "sort": "Latest"})
            if not items:
                continue

            author = parse_author(items[0])
            if not author:
                continue

            now_iso = utcnow_iso()
            account_id = row["id"]

            sb_patch(
                "sns_accounts",
                {"id": f"eq.{account_id}"},
                {
                    "account_name": author.get("account_name") or username,
                    "account_url": author.get("account_url") or f"https://x.com/{username}",
                    "caption": author.get("caption"),
                    "profile_image_url": author.get("profile_image_url"),
                    "is_verified": author.get("is_verified"),
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
                        "followers": author.get("followers"),
                        "following": author.get("following"),
                        "posts": author.get("posts"),
                        "maximum_likes": author.get("maximum_likes"),
                        "created_at": now_iso,
                    }
                ],
                on_conflict="account_id,metric_date",
            )

            total_processed += 1
            time.sleep(SLEEP_BETWEEN + random.uniform(0, 0.3))

        offset += BATCH_SIZE

    print(f"Done. Updated {total_processed} bookmarked X accounts.")


if __name__ == "__main__":
    main()
