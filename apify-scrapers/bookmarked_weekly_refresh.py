#!/usr/bin/env python3
import importlib
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import requests
from dotenv import load_dotenv
import influencer_commenter_quality_aggregate as commenter_quality_aggregate
import influencer_growth_anomaly_analyze as growth_anomaly_analyze
import influencer_performance_aggregate as performance_aggregate
import post_commenter_quality_analyze as commenter_quality_analyze
import post_sponsorship_analyze as sponsorship_analyze

load_dotenv()


def must_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Missing env var: {key}")
    return value.strip()


def env_int(key: str, default: int) -> int:
    value = os.getenv(key)
    return int(value) if value and value.strip() else default


def env_float(key: str, default: float) -> float:
    value = os.getenv(key)
    return float(value) if value and value.strip() else default


def env_int_list(key: str) -> List[int]:
    value = os.getenv(key, "")
    ids: List[int] = []
    for token in value.split(","):
        token = token.strip()
        if token:
            ids.append(int(token))
    return ids


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def iso_to_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

BOOKMARK_ANALYSIS_REFRESH_HOURS = env_int("BOOKMARK_ANALYSIS_REFRESH_HOURS", 24 * 7)
BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT = env_int("BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT", 20)
BOOKMARK_MAX_ACCOUNTS_PER_RUN = env_int("BOOKMARK_MAX_ACCOUNTS_PER_RUN", 200)
BOOKMARK_ACCOUNT_BATCH_SIZE = env_int("BOOKMARK_ACCOUNT_BATCH_SIZE", 100)
BOOKMARK_SLEEP_SECONDS = env_float("BOOKMARK_SLEEP_SECONDS", 0.2)
BOOKMARK_MIN_POST_SUCCESS_RATE = env_float("BOOKMARK_MIN_POST_SUCCESS_RATE", 0.8)
BOOKMARK_ACCOUNT_IDS = env_int_list("BOOKMARK_ACCOUNT_IDS")

SUPPORTED_PLATFORMS = ("instagram", "tiktok", "youtube", "x")

BOOKMARK_PLATFORMS = tuple(
    platform
    for platform in (
        token.strip().lower()
        for token in os.getenv("BOOKMARK_PLATFORMS", ",".join(SUPPORTED_PLATFORMS)).split(",")
    )
    if platform in SUPPORTED_PLATFORMS
)
if not BOOKMARK_PLATFORMS:
    raise RuntimeError("BOOKMARK_PLATFORMS did not contain any supported platform.")

MODULE_DIR_BY_PLATFORM = {
    "instagram": "instagram",
    "tiktok": "tiktok",
    "youtube": "youtube",
    "x": "X",
}

ROOT_DIR = Path(__file__).resolve().parent
_MODULE_CACHE: Dict[str, Any] = {}


def load_module(platform: str, module_name: str):
    cache_key = f"{platform}:{module_name}"
    if cache_key in _MODULE_CACHE:
        return _MODULE_CACHE[cache_key]

    module_dir = ROOT_DIR / MODULE_DIR_BY_PLATFORM[platform]
    module_dir_str = str(module_dir)
    if module_dir_str not in sys.path:
        sys.path.insert(0, module_dir_str)

    module = importlib.import_module(module_name)
    _MODULE_CACHE[cache_key] = module
    return module


def sb_headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def sb_get(
    table: str,
    params: Dict[str, str],
    range_from: int = 0,
    range_to: int = 99,
) -> List[Dict[str, Any]]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = sb_headers()
    headers["Range"] = f"{range_from}-{range_to}"
    response = requests.get(url, headers=headers, params=params, timeout=60)
    if not response.ok:
        raise RuntimeError(f"GET {table} failed: {response.status_code} {response.text[:500]}")
    data = response.json()
    return data if isinstance(data, list) else []


def sb_upsert(table: str, rows: List[Dict[str, Any]], on_conflict: Optional[str] = None) -> List[Dict[str, Any]]:
    if not rows:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = sb_headers()
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    params: Dict[str, str] = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    response = requests.post(url, headers=headers, params=params, json=rows, timeout=60)
    if not response.ok:
        raise RuntimeError(f"UPSERT {table} failed: {response.status_code} {response.text[:500]}")
    data = response.json()
    return data if isinstance(data, list) else []


def chunked(values: Iterable[int], size: int) -> Iterable[List[int]]:
    batch: List[int] = []
    for value in values:
        batch.append(int(value))
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def supabase_table_columns(table: str) -> set[str]:
    try:
        rows = sb_get(table, {"select": "*", "limit": "1"})
        if rows:
            return set(rows[0].keys())
    except Exception:
        pass

    if table == "analysis_job_runs":
        return {
            "analysis_name",
            "account_id",
            "platform",
            "status",
            "rows_written",
            "error_message",
            "details",
            "analysis_version",
            "started_at",
            "finished_at",
        }
    if table == "influencer_growth_anomaly_summary":
        return {
            "account_id",
            "platform",
            "window_label",
            "growth_anomaly_score",
            "analysis_status",
            "analysis_version",
            "updated_at",
        }
    if table == "influencer_performance_summary":
        return {
            "account_id",
            "window",
            "engagement_trend_score",
            "updated_at",
        }
    if table == "influencer_commenter_quality_summary":
        return {
            "account_id",
            "platform",
            "window_label",
            "avg_unique_commenters",
            "updated_at",
        }
    if table == "analysis_unique_indexes":
        return {"table_name", "tablename", "index_name", "indexname", "indexdef"}
    return set()


JOB_RUN_COLUMNS = supabase_table_columns("analysis_job_runs")
GROWTH_SUMMARY_COLUMNS = supabase_table_columns("influencer_growth_anomaly_summary")
PERFORMANCE_SUMMARY_COLUMNS = supabase_table_columns("influencer_performance_summary")
COMMENTER_SUMMARY_COLUMNS = supabase_table_columns("influencer_commenter_quality_summary")
INDEX_COLUMNS = supabase_table_columns("analysis_unique_indexes")


def validate_required_columns(table: str, available: set[str], required: set[str]) -> None:
    missing = sorted(required - available)
    if missing:
        raise RuntimeError(f"{table} is missing required columns: {', '.join(missing)}")


def validate_unique_index(table: str, columns: tuple[str, ...]) -> None:
    if not INDEX_COLUMNS:
        return
    rows = sb_get(
        "analysis_unique_indexes",
        {"select": "*"},
        range_from=0,
        range_to=50,
    )
    expected = f"onpublic.{table}usingbtree({','.join(columns)})"
    for row in rows:
        row_table = str(row.get("table_name") or row.get("tablename") or "").strip()
        if row_table != table:
            continue
        indexdef = str(row.get("indexdef") or "").lower().replace('"', "").replace(" ", "")
        if "createuniqueindex" in indexdef and expected in indexdef:
            return
    raise RuntimeError(f"Missing unique index for {table} on ({', '.join(columns)})")


def validate_runtime_schema() -> None:
    if hasattr(growth_anomaly_analyze, "validate_runtime_schema"):
        growth_anomaly_analyze.validate_runtime_schema()
    if hasattr(commenter_quality_analyze, "validate_runtime_schema"):
        commenter_quality_analyze.validate_runtime_schema()
    if hasattr(sponsorship_analyze, "validate_runtime_schema"):
        sponsorship_analyze.validate_runtime_schema()
    if hasattr(commenter_quality_aggregate, "validate_runtime_schema"):
        commenter_quality_aggregate.validate_runtime_schema()
    validate_required_columns(
        "analysis_job_runs",
        JOB_RUN_COLUMNS,
        {"analysis_name", "account_id", "platform", "status", "finished_at"},
    )
    validate_required_columns(
        "influencer_growth_anomaly_summary",
        GROWTH_SUMMARY_COLUMNS,
        {"account_id", "platform", "window_label", "growth_anomaly_score", "analysis_status", "updated_at"},
    )
    validate_required_columns(
        "influencer_performance_summary",
        PERFORMANCE_SUMMARY_COLUMNS,
        {"account_id", "window", "engagement_trend_score", "updated_at"},
    )
    validate_required_columns(
        "influencer_commenter_quality_summary",
        COMMENTER_SUMMARY_COLUMNS,
        {"account_id", "platform", "window_label", "avg_unique_commenters", "updated_at"},
    )
    validate_unique_index("influencer_growth_anomaly_summary", ("account_id", "window_label", "analysis_version"))
    validate_unique_index("influencer_performance_summary", ("account_id", "window"))
    validate_unique_index("influencer_commenter_quality_summary", ("account_id", "window_label", "analysis_version"))


def record_analysis_run(
    analysis_name: str,
    account_id: int,
    platform: str,
    status: str,
    *,
    rows_written: Optional[int] = None,
    error_message: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    analysis_version: Optional[str] = None,
    started_at: Optional[str] = None,
) -> None:
    if not JOB_RUN_COLUMNS:
        return

    payload = {
        "analysis_name": analysis_name,
        "account_id": account_id,
        "platform": platform,
        "status": status,
        "rows_written": rows_written,
        "error_message": error_message[:1000] if error_message else None,
        "details": details or {},
        "analysis_version": analysis_version,
        "started_at": started_at or utcnow_iso(),
        "finished_at": utcnow_iso(),
    }
    payload = {key: value for key, value in payload.items() if key in JOB_RUN_COLUMNS}
    try:
        sb_upsert("analysis_job_runs", [payload], on_conflict=None)
    except Exception:
        return


def get_latest_analysis_run_map(account_ids: List[int], analysis_names: List[str]) -> Dict[tuple[int, str], str]:
    if not account_ids or not analysis_names or not JOB_RUN_COLUMNS:
        return {}

    rows: List[Dict[str, Any]] = []
    for batch in chunked(account_ids, 100):
        rows.extend(
            sb_get(
                "analysis_job_runs",
                {
                    "select": "account_id,analysis_name,finished_at,status",
                    "account_id": f"in.({','.join(str(account_id) for account_id in batch)})",
                    "analysis_name": f"in.({','.join(analysis_names)})",
                    "status": "not.eq.failed",
                    "order": "finished_at.desc",
                },
                range_from=0,
                range_to=max(len(batch) * max(len(analysis_names), 1) * 2 - 1, 0),
            )
        )

    latest_by_key: Dict[tuple[int, str], datetime] = {}
    for row in rows:
        account_id = row.get("account_id")
        analysis_name = row.get("analysis_name")
        finished_at = iso_to_dt(row.get("finished_at"))
        if account_id is None or analysis_name is None or finished_at is None:
            continue
        key = (int(account_id), str(analysis_name))
        current = latest_by_key.get(key)
        if current is None or finished_at > current:
            latest_by_key[key] = finished_at

    return {key: value.isoformat() for key, value in latest_by_key.items()}


def get_bookmarked_accounts() -> List[Dict[str, Any]]:
    if BOOKMARK_ACCOUNT_IDS:
        return sb_get(
            "sns_accounts",
            {
                "select": "id,platform,account_name,account_url,last_posts_scraped_at,bookmarks",
                "id": f"in.({','.join(str(account_id) for account_id in BOOKMARK_ACCOUNT_IDS)})",
                "order": "id.asc",
            },
            range_from=0,
            range_to=max(len(BOOKMARK_ACCOUNT_IDS) - 1, 0),
        )

    accounts: List[Dict[str, Any]] = []
    offset = 0
    platform_filter = ",".join(BOOKMARK_PLATFORMS)

    while len(accounts) < BOOKMARK_MAX_ACCOUNTS_PER_RUN:
        rows = sb_get(
            "sns_accounts",
            {
                "select": "id,platform,account_name,account_url,last_posts_scraped_at,bookmarks",
                "platform": f"in.({platform_filter})",
                "and": "(bookmarks.not.is.null,bookmarks.not.eq.{})",
                "order": "id.asc",
            },
            range_from=offset,
            range_to=offset + BOOKMARK_ACCOUNT_BATCH_SIZE - 1,
        )
        if not rows:
            break
        accounts.extend(rows)
        offset += BOOKMARK_ACCOUNT_BATCH_SIZE

    return accounts[:BOOKMARK_MAX_ACCOUNTS_PER_RUN]


def get_average_analysis_updated_at(account_ids: List[int]) -> Dict[int, str]:
    if not account_ids:
        return {}

    rows: List[Dict[str, Any]] = []
    for batch in chunked(account_ids, 100):
        rows.extend(
            sb_get(
                "influencer_average_comment_analysis",
                {
                    "select": "account_id,updated_at",
                    "window": "eq.all_posts",
                    "account_id": f"in.({','.join(str(account_id) for account_id in batch)})",
                },
                range_from=0,
                range_to=max(len(batch) - 1, 0),
            )
        )
    return {
        int(row["account_id"]): row.get("updated_at")
        for row in rows
        if row.get("account_id") is not None
    }


def get_summary_analysis_updated_at(
    table: str,
    account_ids: List[int],
    extra_params: Optional[Dict[str, str]] = None,
) -> Dict[int, str]:
    if not account_ids:
        return {}

    rows: List[Dict[str, Any]] = []
    for batch in chunked(account_ids, 100):
        params = {
            "select": "account_id,updated_at",
            "account_id": f"in.({','.join(str(account_id) for account_id in batch)})",
        }
        if extra_params:
            params.update(extra_params)
        rows.extend(
            sb_get(
                table,
                params,
                range_from=0,
                range_to=max(len(batch) * 3 - 1, 0),
            )
        )

    newest_by_account: Dict[int, datetime] = {}
    for row in rows:
        account_id = row.get("account_id")
        updated_at = iso_to_dt(row.get("updated_at"))
        if account_id is None or updated_at is None:
            continue
        account_key = int(account_id)
        current = newest_by_account.get(account_key)
        if current is None or updated_at > current:
            newest_by_account[account_key] = updated_at

    return {account_id: updated_at.isoformat() for account_id, updated_at in newest_by_account.items()}


def get_recent_post_analysis_updated_at(account_id: int, analysis_table: str, analysis_version: str) -> Optional[str]:
    posts = get_recent_posts_for_account(account_id, BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT)
    post_ids = [int(post["id"]) for post in posts if post.get("id") is not None]
    if not post_ids:
        return None

    rows: List[Dict[str, Any]] = []
    for batch in chunked(post_ids, 100):
        rows.extend(
            sb_get(
                analysis_table,
                {
                    "select": "post_id,updated_at",
                    "analysis_version": f"eq.{analysis_version}",
                    "post_id": f"in.({','.join(str(post_id) for post_id in batch)})",
                    "order": "updated_at.desc",
                },
                range_from=0,
                range_to=max(len(batch) - 1, 0),
            )
        )

    newest = max((iso_to_dt(row.get("updated_at")) for row in rows), default=None)
    return newest.isoformat() if newest else None


def is_due(last_updated_at: Optional[str]) -> bool:
    last_dt = iso_to_dt(last_updated_at)
    if not last_dt:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(hours=BOOKMARK_ANALYSIS_REFRESH_HOURS)
    return last_dt < cutoff


def get_recent_posts_for_account(account_id: int, limit: int) -> List[Dict[str, Any]]:
    if limit <= 0:
        return []
    return sb_get(
        "posts",
        {
            "select": "id,account_id,external_post_id,link,posted_at,scraped_at",
            "account_id": f"eq.{account_id}",
            "order": "posted_at.desc,id.desc",
        },
        range_from=0,
        range_to=limit - 1,
    )


def aggregate_account(platform: str, account_id: int) -> int:
    if platform == "instagram":
        aggregate_module = load_module(platform, "instagram_account_aggregate")
    elif platform == "tiktok":
        aggregate_module = load_module(platform, "tiktok_account_aggregate")
    elif platform == "youtube":
        aggregate_module = load_module(platform, "youtube_account_aggregate")
    elif platform == "x":
        aggregate_module = load_module(platform, "x_account_aggregate")
    else:
        raise RuntimeError(f"Unsupported platform for aggregation: {platform}")

    post_ids = aggregate_module.get_all_post_ids_for_account(account_id)
    analyses = aggregate_module.get_post_analyses(post_ids)
    if not analyses:
        return 0

    aggregate_module.upsert_influencer_average(account_id, "all_posts", analyses)
    return len(analyses)


def aggregate_performance(account_id: int, platform: str) -> Optional[Dict[str, Any]]:
    return performance_aggregate.aggregate_performance_for_account(account_id, platform=platform)


def analyze_growth_anomalies(account_id: int, platform: str) -> Dict[str, Any]:
    return growth_anomaly_analyze.analyze_account(account_id, platform=platform)


def analyze_sponsorship(account_id: int, platform: str) -> Dict[str, Any]:
    return sponsorship_analyze.analyze_recent_posts_for_account(
        account_id,
        platform=platform,
        limit=BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT,
    )


def analyze_commenter_quality(account_id: int, platform: str) -> Dict[str, Any]:
    return commenter_quality_analyze.analyze_posts_for_account(
        account_id,
        platform=platform,
        limit=BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT,
    )


def aggregate_commenter_quality(account_id: int, platform: str) -> Optional[Dict[str, Any]]:
    return commenter_quality_aggregate.aggregate_for_account(account_id, platform=platform)


def refresh_instagram_posts(account: Dict[str, Any]) -> int:
    trending = load_module("instagram", "ingest_trending_instagram")

    account_id = int(account["id"])
    username = str(account.get("account_name") or "").strip().lstrip("@")
    account_url = (account.get("account_url") or "").strip()
    if not account_url and username:
        account_url = f"https://www.instagram.com/{username}/"
    if not account_url:
        raise RuntimeError(f"Instagram account_id={account_id} is missing account_url/account_name")

    posts = trending.apify_scrape_posts(account_url)
    trending.ingest_posts_and_metrics(account_id, posts)
    trending.mark_posts_scraped(account_id)
    return len(posts)


def refresh_tiktok_posts(account: Dict[str, Any]) -> int:
    trending = load_module("tiktok", "ingest_trending_tiktok")

    account_id = int(account["id"])
    username = str(account.get("account_name") or "").strip().lstrip("@")
    if not username:
        raise RuntimeError(f"TikTok account_id={account_id} is missing account_name")

    payload = trending.build_profile_payload(username)
    items = trending.apify_run_actor_sync_get_items(trending.APIFY_TIKTOK_PROFILE_ACTOR, payload)
    if items:
        author = trending.parse_author_from_item(items[0])
        if author:
            trending.upsert_full_sns_account_tiktok(account_id, author, keyword=None)
            trending.upsert_accounts_metrics(
                account_id,
                author.get("followers") or 0,
                author.get("following") or 0,
                author.get("maximum_likes"),
                author.get("posts"),
            )

    trending.upsert_posts_and_metrics(account_id, items)
    trending.mark_posts_scraped(account_id)
    return len(items)


def refresh_youtube_posts(account: Dict[str, Any]) -> int:
    trending = load_module("youtube", "ingest_trending_youtube")

    account_id = int(account["id"])
    channel_url = (account.get("account_url") or "").strip()
    channel_key = str(account.get("account_name") or "").strip()
    if not channel_url and channel_key:
        channel_url = f"https://www.youtube.com/@{channel_key}"
    if not channel_url:
        raise RuntimeError(f"YouTube account_id={account_id} is missing account_url/account_name")

    items = trending.apify_run_youtube(
        {
            "startUrls": [{"url": channel_url}],
            "maxResults": trending.YT_TRENDING_CHANNEL_MAX_RESULTS,
            "maxResultsShorts": 0,
            "maxResultStreams": 0,
            "sortingOrder": "date",
        }
    )
    if items:
        channel = trending.parse_channel_from_item(items[0])
        if channel:
            trending.upsert_full_sns_account_youtube(account_id, channel, keyword="")
            trending.upsert_accounts_metrics(
                account_id,
                channel.get("followers") or 0,
                channel.get("maximum_likes"),
                channel.get("posts"),
            )

    trending.upsert_posts_and_metrics(account_id, items)
    trending.mark_posts_scraped(account_id)
    return len(items)


def refresh_x_posts(account: Dict[str, Any]) -> int:
    trending = load_module("x", "ingest_trending_x")

    account_id = int(account["id"])
    username = str(account.get("account_name") or "").strip().lstrip("@")
    if not username:
        raise RuntimeError(f"X account_id={account_id} is missing account_name")

    items = trending.apify_run(
        {
            "twitterHandles": [username],
            "maxItems": trending.X_TWEETS_PER_INFLUENCER,
            "sort": "Latest",
        }
    )
    if items:
        author = trending.parse_author(items[0])
        if author:
            trending.upsert_full_sns_account_x(account_id, author, keyword="")
            trending.upsert_accounts_metrics(
                account_id,
                trending.safe_int(author.get("followers"), 0),
                trending.safe_int(author.get("following"), 0),
                trending.safe_int(author.get("posts"), 0),
                trending.safe_int(author.get("maximum_likes"), 0),
            )

    trending.upsert_posts_and_metrics(account_id, items)
    trending.mark_posts_scraped(account_id)
    return len(items)


def refresh_posts_for_account(account: Dict[str, Any]) -> int:
    platform = str(account.get("platform") or "").strip().lower()
    if platform == "instagram":
        return refresh_instagram_posts(account)
    if platform == "tiktok":
        return refresh_tiktok_posts(account)
    if platform == "youtube":
        return refresh_youtube_posts(account)
    if platform == "x":
        return refresh_x_posts(account)
    raise RuntimeError(f"Unsupported platform: {platform}")


def analyze_posts_for_account(account: Dict[str, Any]) -> Dict[str, Any]:
    platform = str(account.get("platform") or "").strip().lower()
    account_id = int(account["id"])
    posts = get_recent_posts_for_account(account_id, BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT)
    if not posts:
        return {
            "posts_seen": 0,
            "posts_processed": 0,
            "posts_failed": 0,
            "failed_post_ids": [],
        }

    if platform == "instagram":
        analysis_module = load_module(platform, "instagram_ingest_and_analyze")
    elif platform == "tiktok":
        analysis_module = load_module(platform, "tiktok_ingest_and_analyze")
    elif platform == "youtube":
        analysis_module = load_module(platform, "youtube_ingest_and_analyze")
    elif platform == "x":
        analysis_module = load_module(platform, "x_ingest_and_analyze")
    else:
        raise RuntimeError(f"Unsupported platform for analysis: {platform}")

    processed = 0
    failed_post_ids: List[int] = []
    for post in posts:
        if platform == "x":
            post["account_name"] = account.get("account_name")
        try:
            analysis_module.process_post(post)
            processed += 1
        except requests.HTTPError as exc:
            print(
                f"[HTTP ERROR] platform={platform} account_id={account_id} "
                f"post_id={post.get('id')} err={exc}"
            )
            if post.get("id") is not None:
                failed_post_ids.append(int(post["id"]))
        except Exception as exc:
            print(
                f"[ERROR] platform={platform} account_id={account_id} "
                f"post_id={post.get('id')} err={exc}"
            )
            if post.get("id") is not None:
                failed_post_ids.append(int(post["id"]))
    return {
        "posts_seen": len(posts),
        "posts_processed": processed,
        "posts_failed": len(failed_post_ids),
        "failed_post_ids": failed_post_ids,
    }


def main() -> None:
    validate_runtime_schema()
    accounts = get_bookmarked_accounts()
    if not accounts:
        print("No bookmarked influencers found.")
        return

    account_ids = [int(account["id"]) for account in accounts]
    required_analyses = [
        "growth_anomaly",
        "post_sponsorship",
        "post_comment_analysis",
        "commenter_quality",
        "account_comment_average",
        "performance_summary",
        "commenter_quality_summary",
    ]
    latest_runs = get_latest_analysis_run_map(account_ids, required_analyses)
    due_accounts: List[Dict[str, Any]] = []
    for account in accounts:
        account_id = int(account["id"])
        freshness_points = tuple(latest_runs.get((account_id, analysis_name)) for analysis_name in required_analyses)
        if any(is_due(updated_at) for updated_at in freshness_points):
            due_accounts.append(account)

    if not due_accounts:
        print("No bookmarked influencers are due for weekly refresh.")
        return

    print(
        f"Running bookmarked refresh for {len(due_accounts)} influencer(s) "
        f"at {utcnow_iso()} with interval={BOOKMARK_ANALYSIS_REFRESH_HOURS}h"
    )

    for account in due_accounts:
        account_id = int(account["id"])
        platform = str(account.get("platform") or "").strip().lower()
        account_name = str(account.get("account_name") or "").strip()

        refresh_started_at = utcnow_iso()
        try:
            fetched_count = refresh_posts_for_account(account)
            record_analysis_run(
                "refresh_posts",
                account_id,
                platform,
                "success",
                rows_written=fetched_count,
                details={"account_name": account_name},
                started_at=refresh_started_at,
            )
        except Exception as exc:
            record_analysis_run(
                "refresh_posts",
                account_id,
                platform,
                "failed",
                error_message=str(exc),
                details={"account_name": account_name},
                started_at=refresh_started_at,
            )
            print(
                f"[ERROR] platform={platform} account_id={account_id} account={account_name} "
                f"step=refresh err={exc}"
            )
            time.sleep(BOOKMARK_SLEEP_SECONDS)
            continue

        growth_row: Dict[str, Any] = {"analysis_status": "skipped", "events_written": 0, "growth_anomaly_score": None}
        growth_started_at = utcnow_iso()
        try:
            growth_row = analyze_growth_anomalies(account_id, platform)
            record_analysis_run(
                "growth_anomaly",
                account_id,
                platform,
                "success" if growth_row.get("analysis_status") == "ok" else str(growth_row.get("analysis_status") or "success"),
                rows_written=int(growth_row.get("events_written") or 0),
                details={"score": growth_row.get("growth_anomaly_score"), "status": growth_row.get("analysis_status")},
                analysis_version=growth_anomaly_analyze.ANALYSIS_VERSION,
                started_at=growth_started_at,
            )
        except Exception as exc:
            record_analysis_run(
                "growth_anomaly",
                account_id,
                platform,
                "failed",
                error_message=str(exc),
                analysis_version=growth_anomaly_analyze.ANALYSIS_VERSION,
                started_at=growth_started_at,
            )
            print(
                f"[ERROR] platform={platform} account_id={account_id} account={account_name} "
                f"step=growth_anomaly err={exc}"
            )

        sponsorship_summary: Dict[str, Any] = {"posts_analyzed": 0, "sponsored_posts": 0}
        sponsorship_started_at = utcnow_iso()
        try:
            sponsorship_summary = analyze_sponsorship(account_id, platform)
            record_analysis_run(
                "post_sponsorship",
                account_id,
                platform,
                "success",
                rows_written=int(sponsorship_summary.get("upserted_rows") or sponsorship_summary.get("posts_analyzed") or 0),
                details={"sponsored_posts": sponsorship_summary.get("sponsored_posts", 0)},
                analysis_version=sponsorship_analyze.ANALYSIS_VERSION,
                started_at=sponsorship_started_at,
            )
        except Exception as exc:
            record_analysis_run(
                "post_sponsorship",
                account_id,
                platform,
                "failed",
                error_message=str(exc),
                analysis_version=sponsorship_analyze.ANALYSIS_VERSION,
                started_at=sponsorship_started_at,
            )
            print(
                f"[ERROR] platform={platform} account_id={account_id} account={account_name} "
                f"step=sponsorship err={exc}"
            )

        post_analysis_started_at = utcnow_iso()
        analysis_stats = analyze_posts_for_account(account)
        record_analysis_run(
            "post_comment_analysis",
            account_id,
            platform,
            "success" if analysis_stats["posts_failed"] == 0 else "partial",
            rows_written=int(analysis_stats["posts_processed"]),
            details={
                "posts_seen": analysis_stats["posts_seen"],
                "posts_failed": analysis_stats["posts_failed"],
                "failed_post_ids": analysis_stats["failed_post_ids"],
            },
            started_at=post_analysis_started_at,
        )
        commenter_quality_summary: Dict[str, Any] = {"posts_analyzed": 0}
        commenter_quality_started_at = utcnow_iso()
        try:
            commenter_quality_summary = analyze_commenter_quality(account_id, platform)
            record_analysis_run(
                "commenter_quality",
                account_id,
                platform,
                "success",
                rows_written=int(commenter_quality_summary.get("posts_analyzed") or 0),
                analysis_version=commenter_quality_analyze.ANALYSIS_VERSION,
                started_at=commenter_quality_started_at,
            )
        except Exception as exc:
            record_analysis_run(
                "commenter_quality",
                account_id,
                platform,
                "failed",
                error_message=str(exc),
                analysis_version=commenter_quality_analyze.ANALYSIS_VERSION,
                started_at=commenter_quality_started_at,
            )
            print(
                f"[ERROR] platform={platform} account_id={account_id} account={account_name} "
                f"step=commenter_quality err={exc}"
            )

        commenter_quality_account_summary: Optional[Dict[str, Any]] = None
        commenter_quality_summary_started_at = utcnow_iso()
        try:
            commenter_quality_account_summary = aggregate_commenter_quality(account_id, platform)
            record_analysis_run(
                "commenter_quality_summary",
                account_id,
                platform,
                "success" if commenter_quality_account_summary else "skipped",
                rows_written=int(commenter_quality_account_summary.get("posts_used") or 0) if commenter_quality_account_summary else 0,
                analysis_version=commenter_quality_aggregate.ANALYSIS_VERSION,
                started_at=commenter_quality_summary_started_at,
            )
        except Exception as exc:
            record_analysis_run(
                "commenter_quality_summary",
                account_id,
                platform,
                "failed",
                error_message=str(exc),
                analysis_version=commenter_quality_aggregate.ANALYSIS_VERSION,
                started_at=commenter_quality_summary_started_at,
            )
            print(
                f"[ERROR] platform={platform} account_id={account_id} account={account_name} "
                f"step=commenter_quality_summary err={exc}"
            )

        post_success_rate = (
            analysis_stats["posts_processed"] / analysis_stats["posts_seen"]
            if analysis_stats["posts_seen"] > 0
            else 1.0
        )
        aggregates_allowed = (
            analysis_stats["posts_seen"] == 0
            or post_success_rate >= BOOKMARK_MIN_POST_SUCCESS_RATE
        )

        aggregated_posts = 0
        performance_row: Optional[Dict[str, Any]] = None
        if aggregates_allowed:
            aggregate_started_at = utcnow_iso()
            try:
                aggregated_posts = aggregate_account(platform, account_id)
                record_analysis_run(
                    "account_comment_average",
                    account_id,
                    platform,
                    "success",
                    rows_written=aggregated_posts,
                    started_at=aggregate_started_at,
                )
            except Exception as exc:
                record_analysis_run(
                    "account_comment_average",
                    account_id,
                    platform,
                    "failed",
                    error_message=str(exc),
                    started_at=aggregate_started_at,
                )
                print(
                    f"[ERROR] platform={platform} account_id={account_id} account={account_name} "
                    f"step=aggregate_account err={exc}"
                )
            performance_started_at = utcnow_iso()
            try:
                performance_row = aggregate_performance(account_id, platform)
                record_analysis_run(
                    "performance_summary",
                    account_id,
                    platform,
                    "success" if performance_row else "skipped",
                    rows_written=int(performance_row.get("posts_used") or 0) if performance_row else 0,
                    started_at=performance_started_at,
                )
            except Exception as exc:
                record_analysis_run(
                    "performance_summary",
                    account_id,
                    platform,
                    "failed",
                    error_message=str(exc),
                    started_at=performance_started_at,
                )
                print(
                    f"[ERROR] platform={platform} account_id={account_id} account={account_name} "
                    f"step=aggregate_performance err={exc}"
                )
        else:
            record_analysis_run(
                "account_comment_average",
                account_id,
                platform,
                "skipped",
                details={"reason": "post_failures", "success_rate": post_success_rate},
            )
            record_analysis_run(
                "performance_summary",
                account_id,
                platform,
                "skipped",
                details={"reason": "post_failures", "success_rate": post_success_rate},
            )
            print(
                f"[SKIP] platform={platform} account_id={account_id} account={account_name} "
                f"step=aggregates reason=post_failures success_rate={post_success_rate:.2f} "
                f"failed_posts={analysis_stats['posts_failed']}"
            )

        performance_score = (
            f"{float(performance_row.get('engagement_trend_score')):.2f}"
            if performance_row and performance_row.get("engagement_trend_score") is not None
            else "N/A"
        )
        growth_score = (
            f"{float(growth_row.get('growth_anomaly_score') or 0.0):.2f}"
            if growth_row.get("growth_anomaly_score") is not None
            else "N/A"
        )
        print(
            f"[OK] platform={platform} account_id={account_id} account={account_name} "
            f"fetched={fetched_count} growth_status={growth_row.get('analysis_status')} "
            f"growth_score={growth_score} anomaly_events={growth_row.get('events_written', 0)} "
            f"sponsorship_posts={sponsorship_summary.get('posts_analyzed', 0)} "
            f"sponsored_posts={sponsorship_summary.get('sponsored_posts', 0)} "
            f"posts_seen={analysis_stats['posts_seen']} processed={analysis_stats['posts_processed']} "
            f"failed={analysis_stats['posts_failed']} commenter_quality_posts={commenter_quality_summary.get('posts_analyzed', 0)} "
            f"commenter_quality_summary_posts={int(commenter_quality_account_summary.get('posts_used') or 0) if commenter_quality_account_summary else 0} "
            f"aggregated_posts={aggregated_posts} performance_score={performance_score}"
        )

        time.sleep(BOOKMARK_SLEEP_SECONDS)


if __name__ == "__main__":
    main()
