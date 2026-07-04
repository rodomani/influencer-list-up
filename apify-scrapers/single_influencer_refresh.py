#!/usr/bin/env python3
"""
Refresh one existing influencer account from Apify.

This script is the backend action that a frontend "refresh data" button should
trigger indirectly through a job runner or backend endpoint. Do not call it from
the browser. It requires service-role Supabase credentials and the Apify token.

Usage:
  python apify-scrapers/single_influencer_refresh.py --account-id 123
  python apify-scrapers/single_influencer_refresh.py --account-id 123 --skip-posts
"""

import argparse
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from dotenv import load_dotenv
from lib.env import env_int, must_env, today_iso, utcnow_iso
from lib.job_runs import record_job_run
from lib.platform_adapters import PlatformModuleLoader
from lib.schema_contract import contract_columns
from lib.supabase_rest import create_supabase_rest

SCRIPT_DIR = Path(__file__).resolve().parent
load_dotenv(SCRIPT_DIR / ".env")
load_dotenv()


SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")
SINGLE_REFRESH_POST_LIMIT = env_int("SINGLE_REFRESH_POST_LIMIT", 25)

SUPPORTED_PLATFORMS = {"instagram", "tiktok", "youtube", "x"}
MODULE_PATHS = {
    "instagram": SCRIPT_DIR / "instagram" / "ingest_trending_instagram.py",
    "tiktok": SCRIPT_DIR / "tiktok" / "ingest_trending_tiktok.py",
    "youtube": SCRIPT_DIR / "youtube" / "ingest_trending_youtube.py",
    "x": SCRIPT_DIR / "X" / "ingest_trending_x.py",
}
SUPABASE = create_supabase_rest(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
MODULE_LOADER = PlatformModuleLoader(SCRIPT_DIR, {})
SNS_ACCOUNT_COLUMNS = contract_columns("sns_accounts")
ACCOUNTS_METRICS_COLUMNS = contract_columns("accounts_metrics")
JOB_RUN_COLUMNS = contract_columns("analysis_job_runs")


def filter_columns(table: str, row: Dict[str, Any]) -> Dict[str, Any]:
    columns = {
        "sns_accounts": SNS_ACCOUNT_COLUMNS,
        "accounts_metrics": ACCOUNTS_METRICS_COLUMNS,
        "analysis_job_runs": JOB_RUN_COLUMNS,
    }.get(table, set())
    return {key: value for key, value in row.items() if not columns or key in columns}


def load_platform_module(platform: str):
    module_path = MODULE_PATHS.get(platform)
    if module_path is None:
        raise RuntimeError(f"Unsupported platform module: {platform}")
    return MODULE_LOADER.load_from_path(platform, module_path)


def record_refresh_run(
    account_id: int,
    platform: str,
    status: str,
    *,
    rows_written: int = 0,
    error_message: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    started_at: Optional[str] = None,
) -> None:
    record_job_run(
        SUPABASE,
        JOB_RUN_COLUMNS,
        analysis_name="single_influencer_refresh",
        account_id=account_id,
        platform=platform,
        status=status,
        rows_written=rows_written,
        error_message=error_message,
        details=details,
        analysis_version="v1",
        started_at=started_at,
    )


def get_account(account_id: int) -> Dict[str, Any]:
    rows = SUPABASE.get(
        "sns_accounts",
        {
            "select": (
                "id,platform,platform_user_id,platform_profile_id,account_name,"
                "account_url,keywords,last_profile_scraped_at,last_posts_scraped_at"
            ),
            "id": f"eq.{account_id}",
            "limit": "1",
        },
        range_from=0,
        range_to=0,
    )
    if not rows:
        raise RuntimeError(f"sns_accounts row not found for id={account_id}")
    row = rows[0]
    platform = str(row.get("platform") or "").strip().lower()
    if platform not in SUPPORTED_PLATFORMS:
        raise RuntimeError(f"Unsupported platform for single refresh: {platform or 'missing'}")
    row["platform"] = platform
    return row


def account_username(account: Dict[str, Any]) -> str:
    # account_name is the public handle used in profile URLs. platform_profile_id
    # may be a numeric external id, which breaks single-profile Apify inputs.
    username = (
        account.get("account_name")
        or account.get("platform_profile_id")
        or ""
    )
    return str(username).strip().lstrip("@")


def patch_account(account_id: int, payload: Dict[str, Any]) -> None:
    SUPABASE.patch("sns_accounts", {"id": f"eq.{account_id}"}, filter_columns("sns_accounts", payload))


def upsert_account_metrics(
    account_id: int,
    *,
    followers: Any,
    following: Any,
    posts: Any,
    maximum_likes: Any,
) -> None:
    row = filter_columns(
        "accounts_metrics",
        {
            "account_id": account_id,
            "metric_date": today_iso(),
            "followers": int(followers or 0),
            "following": int(following or 0) if following is not None else None,
            "posts": int(posts or 0) if posts is not None else None,
            "maximum_likes": int(maximum_likes or 0) if maximum_likes is not None else None,
            "created_at": utcnow_iso(),
        },
    )
    SUPABASE.upsert("accounts_metrics", [row], on_conflict="account_id,metric_date")


def refresh_instagram(account: Dict[str, Any], *, include_posts: bool) -> Dict[str, int]:
    ig = load_platform_module("instagram")
    username = account_username(account)
    if not username:
        raise RuntimeError("Instagram account has no username/profile id.")

    details_items = ig.apify_run_instagram_scraper(
        {
            "directUrls": [f"https://www.instagram.com/{username}/"],
            "resultsType": "details",
            "resultsLimit": 1,
            "searchType": "user",
        }
    )
    profile = next((ig.parse_profile(item) for item in details_items if ig.parse_profile(item)), None)
    if not profile:
        raise RuntimeError(f"Apify returned no Instagram profile for {username}.")

    now_iso = utcnow_iso()
    account_id = int(account["id"])
    stored_image_url = None
    if hasattr(ig, "upload_profile_image"):
        stored_image_url = ig.upload_profile_image(profile.get("profile_pic_url"), str(profile["platform_user_id"]))

    patch_account(
        account_id,
        {
            "account_name": profile.get("username") or username,
            "account_url": profile.get("account_url") or f"https://www.instagram.com/{username}/",
            "caption": profile.get("biography"),
            "profile_image_url": stored_image_url or profile.get("profile_pic_url"),
            "is_verified": profile.get("is_verified"),
            "business_account": profile.get("is_business"),
            "platform_user_id": profile.get("platform_user_id") or account.get("platform_user_id"),
            "platform_profile_id": profile.get("username") or account.get("platform_profile_id"),
            "last_profile_scraped_at": now_iso,
            "updated_at": now_iso,
        },
    )
    upsert_account_metrics(
        account_id,
        followers=profile.get("followers"),
        following=profile.get("following"),
        posts=profile.get("posts_count"),
        maximum_likes=profile.get("maximum_likes"),
    )

    posts_written = 0
    if include_posts:
        profile_url = profile.get("account_url") or account.get("account_url") or f"https://www.instagram.com/{username}/"
        posts = ig.apify_scrape_posts(profile_url)[:SINGLE_REFRESH_POST_LIMIT]
        ig.ingest_posts_and_metrics(account_id, posts)
        ig.mark_posts_scraped(account_id)
        posts_written = len(posts)

    return {"profile_rows": 1, "metric_rows": 1, "post_items": posts_written}


def refresh_tiktok(account: Dict[str, Any], *, include_posts: bool) -> Dict[str, int]:
    tiktok = load_platform_module("tiktok")
    username = account_username(account)
    if not username:
        raise RuntimeError("TikTok account has no username.")

    payload = tiktok.build_profile_payload(username)
    # clockworks/tiktok-scraper expects one of postURLs, hashtags,
    # searchQueries, music, or profiles. Older local templates used
    # "usernames", which makes the actor fail before scraping.
    payload.pop("usernames", None)
    payload["profiles"] = [username.lstrip("@")]
    items = tiktok.apify_run_actor_sync_get_items(tiktok.APIFY_TIKTOK_PROFILE_ACTOR, payload)
    if not items:
        raise RuntimeError(f"Apify returned no TikTok items for {username}.")

    author = next((tiktok.parse_author_from_item(item) for item in items if tiktok.parse_author_from_item(item)), None)
    if not author:
        raise RuntimeError(f"Apify returned no TikTok author for {username}.")

    account_id = int(account["id"])
    tiktok.upsert_full_sns_account_tiktok(account_id, author, keyword=None)
    tiktok.upsert_accounts_metrics(
        account_id,
        int(author.get("followers") or 0),
        int(author.get("following") or 0),
        author.get("maximum_likes"),
        author.get("posts"),
    )

    posts_written = 0
    if include_posts:
        tiktok.upsert_posts_and_metrics(account_id, items[:SINGLE_REFRESH_POST_LIMIT])
        tiktok.mark_posts_scraped(account_id)
        posts_written = len(items[:SINGLE_REFRESH_POST_LIMIT])

    return {"profile_rows": 1, "metric_rows": 1, "post_items": posts_written}


def refresh_youtube(account: Dict[str, Any], *, include_posts: bool) -> Dict[str, int]:
    yt = load_platform_module("youtube")
    channel_url = str(account.get("account_url") or "").strip()
    if not channel_url:
        username = account_username(account)
        if username:
            channel_url = f"https://www.youtube.com/@{username}"
    if not channel_url:
        raise RuntimeError("YouTube account has no account_url or channel key.")

    max_results = SINGLE_REFRESH_POST_LIMIT if include_posts else 1
    items = yt.apify_run_youtube(
        {
            "startUrls": [{"url": channel_url}],
            "maxResults": max_results,
            "maxResultsShorts": 0,
            "maxResultStreams": 0,
            "sortingOrder": "date",
        }
    )
    if not items:
        raise RuntimeError(f"Apify returned no YouTube items for {channel_url}.")

    channel = next((yt.parse_channel_from_item(item) for item in items if yt.parse_channel_from_item(item)), None)
    if not channel:
        raise RuntimeError(f"Apify returned no YouTube channel for {channel_url}.")

    account_id = int(account["id"])
    yt.upsert_full_sns_account_youtube(account_id, channel, keyword="")
    yt.upsert_accounts_metrics(account_id, channel.get("followers"), channel.get("maximum_likes"), channel.get("posts"))

    posts_written = 0
    if include_posts:
        yt.upsert_posts_and_metrics(account_id, items[:SINGLE_REFRESH_POST_LIMIT])
        yt.mark_posts_scraped(account_id)
        posts_written = len(items[:SINGLE_REFRESH_POST_LIMIT])

    return {"profile_rows": 1, "metric_rows": 1, "post_items": posts_written}


def refresh_x(account: Dict[str, Any], *, include_posts: bool) -> Dict[str, int]:
    x = load_platform_module("x")
    username = account_username(account)
    if not username:
        raise RuntimeError("X account has no username.")

    max_items = SINGLE_REFRESH_POST_LIMIT if include_posts else 1
    items = x.apify_run({"twitterHandles": [username], "maxItems": max_items, "sort": "Latest"})
    if not items:
        raise RuntimeError(f"Apify returned no X items for {username}.")

    author = next((x.parse_author(item) for item in items if x.parse_author(item)), None)
    if not author:
        raise RuntimeError(f"Apify returned no X author for {username}.")

    account_id = int(account["id"])
    x.upsert_full_sns_account_x(account_id, author, keyword="")
    x.upsert_accounts_metrics(
        account_id,
        x.safe_int(author.get("followers"), 0),
        x.safe_int(author.get("following"), 0),
        x.safe_int(author.get("posts"), 0),
        x.safe_int(author.get("maximum_likes"), 0),
    )

    posts_written = 0
    if include_posts:
        x.upsert_posts_and_metrics(account_id, items[:SINGLE_REFRESH_POST_LIMIT])
        x.mark_posts_scraped(account_id)
        posts_written = len(items[:SINGLE_REFRESH_POST_LIMIT])

    return {"profile_rows": 1, "metric_rows": 1, "post_items": posts_written}


PLATFORM_REFRESHERS: Dict[str, Callable[[Dict[str, Any], bool], Dict[str, int]]] = {
    "instagram": refresh_instagram,
    "tiktok": refresh_tiktok,
    "youtube": refresh_youtube,
    "x": refresh_x,
}


def run_platform_refresh(platform: str, account: Dict[str, Any], *, include_posts: bool) -> Dict[str, int]:
    refresher = PLATFORM_REFRESHERS.get(platform)
    if refresher is None:
        raise RuntimeError(f"Unsupported platform: {platform}")
    return refresher(account, include_posts=include_posts)


def refresh_single_influencer(
    account_id: int,
    *,
    include_posts: bool = True,
    record_runs: bool = True,
) -> Dict[str, Any]:
    account = get_account(account_id)
    platform = str(account["platform"])
    started_at = utcnow_iso()
    if record_runs:
        record_refresh_run(account_id, platform, "running", started_at=started_at)

    try:
        details = run_platform_refresh(platform, account, include_posts=include_posts)
        rows_written = int(details.get("profile_rows", 0)) + int(details.get("metric_rows", 0)) + int(details.get("post_items", 0))
        if record_runs:
            record_refresh_run(
                account_id,
                platform,
                "completed",
                rows_written=rows_written,
                details={**details, "include_posts": include_posts},
                started_at=started_at,
            )
        return {
            "account_id": account_id,
            "platform": platform,
            "status": "completed",
            "rows_written": rows_written,
            "details": details,
        }
    except Exception as exc:
        if record_runs:
            record_refresh_run(
                account_id,
                platform,
                "failed",
                error_message=str(exc),
                details={"include_posts": include_posts},
                started_at=started_at,
            )
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh one influencer from Apify into Supabase.")
    parser.add_argument("--account-id", type=int, required=True, help="sns_accounts.id to refresh")
    parser.add_argument("--skip-posts", action="store_true", help="Refresh profile and account metrics only")
    args = parser.parse_args()

    result = refresh_single_influencer(args.account_id, include_posts=not args.skip_posts)
    print(result)


if __name__ == "__main__":
    main()
