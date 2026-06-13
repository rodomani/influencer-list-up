#!/usr/bin/env python3
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set

import requests
from dotenv import load_dotenv

load_dotenv()


def must_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Missing env var: {key}")
    return value.strip()


def env_int(key: str, default: int) -> int:
    value = os.getenv(key)
    return int(value) if value and value.strip() else default


def env_str(key: str, default: str) -> str:
    value = os.getenv(key)
    return value.strip() if value and value.strip() else default


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def safe_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        if isinstance(value, bool):
            return float(int(value))
        return float(value)
    except Exception:
        return None


SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

SUPPORTED_PLATFORMS = ("instagram", "tiktok", "youtube", "x")
PLATFORMS = tuple(
    token.strip().lower()
    for token in env_str("COMMENTER_QUALITY_SUMMARY_PLATFORMS", ",".join(SUPPORTED_PLATFORMS)).split(",")
    if token.strip().lower() in SUPPORTED_PLATFORMS
)

WINDOW_DAYS = env_int("COMMENTER_QUALITY_SUMMARY_WINDOW_DAYS", 90)
WINDOW_LABEL = env_str("COMMENTER_QUALITY_SUMMARY_WINDOW_LABEL", f"{WINDOW_DAYS}d" if WINDOW_DAYS > 0 else "all_time")
POST_LIMIT = env_int("COMMENTER_QUALITY_SUMMARY_POST_LIMIT", 20)
MAX_ACCOUNTS_PER_RUN = env_int("COMMENTER_QUALITY_SUMMARY_MAX_ACCOUNTS_PER_RUN", 500)
ANALYSIS_VERSION = env_str("COMMENTER_QUALITY_ANALYSIS_VERSION", "v1")


def sb_headers(prefer: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def sb_get(table: str, params: Dict[str, str], range_from: int = 0, range_to: int = 99) -> List[Dict[str, Any]]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = sb_headers()
    headers["Range"] = f"{range_from}-{range_to}"
    response = requests.get(url, params=params, headers=headers, timeout=60)
    if not response.ok:
        raise RuntimeError(f"GET {table} failed: {response.status_code} {response.text[:800]}")
    data = response.json()
    return data if isinstance(data, list) else []


def sb_upsert(table: str, rows: List[Dict[str, Any]], on_conflict: Optional[str]) -> List[Dict[str, Any]]:
    if not rows:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = sb_headers("resolution=merge-duplicates,return=representation")
    params: Dict[str, str] = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    response = requests.post(url, params=params, headers=headers, json=rows, timeout=60)
    if not response.ok:
        raise RuntimeError(f"UPSERT {table} failed: {response.status_code} {response.text[:800]}")
    data = response.json()
    return data if isinstance(data, list) else []


def supabase_table_columns(table: str) -> Set[str]:
    try:
        rows = sb_get(table, {"select": "*", "limit": "1"})
        if rows:
            return set(rows[0].keys())
    except Exception:
        pass

    if table == "posts":
        return {"id", "account_id", "posted_at", "scraped_at"}
    if table == "post_commenter_quality_analysis":
        return {
            "post_id",
            "unique_commenters",
            "avg_comments_per_commenter",
            "repeat_commenter_rate",
            "substantive_comment_rate",
            "question_rate",
            "low_signal_comment_rate",
            "suspicious_commenter_rate",
            "analysis_version",
            "updated_at",
        }
    if table == "influencer_commenter_quality_summary":
        return {
            "account_id",
            "platform",
            "window_label",
            "avg_unique_commenters",
            "avg_comments_per_commenter",
            "avg_repeat_commenter_rate",
            "avg_substantive_comment_rate",
            "avg_question_rate",
            "avg_low_signal_comment_rate",
            "avg_suspicious_commenter_rate",
            "posts_used",
            "analysis_version",
            "updated_at",
            "created_at",
        }
    if table == "analysis_unique_indexes":
        return {"table_name", "tablename", "index_name", "indexname", "indexdef"}
    return set()


POSTS_COLUMNS = supabase_table_columns("posts")
QUALITY_COLUMNS = supabase_table_columns("post_commenter_quality_analysis")
SUMMARY_COLUMNS = supabase_table_columns("influencer_commenter_quality_summary")
INDEX_COLUMNS = supabase_table_columns("analysis_unique_indexes")


def validate_required_columns(table: str, available: Set[str], required: Set[str]) -> None:
    missing = sorted(required - available)
    if missing:
        raise RuntimeError(f"{table} is missing required columns: {', '.join(missing)}")


def validate_unique_index(table: str, columns: Sequence[str]) -> None:
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
    validate_required_columns("posts", POSTS_COLUMNS, {"id", "account_id"})
    validate_required_columns(
        "post_commenter_quality_analysis",
        QUALITY_COLUMNS,
        {
            "post_id",
            "unique_commenters",
            "avg_comments_per_commenter",
            "repeat_commenter_rate",
            "substantive_comment_rate",
            "question_rate",
            "low_signal_comment_rate",
            "suspicious_commenter_rate",
            "analysis_version",
            "updated_at",
        },
    )
    validate_required_columns(
        "influencer_commenter_quality_summary",
        SUMMARY_COLUMNS,
        {
            "account_id",
            "platform",
            "window_label",
            "avg_unique_commenters",
            "avg_comments_per_commenter",
            "avg_repeat_commenter_rate",
            "avg_substantive_comment_rate",
            "avg_question_rate",
            "avg_low_signal_comment_rate",
            "avg_suspicious_commenter_rate",
            "posts_used",
            "analysis_version",
            "updated_at",
        },
    )
    validate_unique_index("influencer_commenter_quality_summary", ("account_id", "window_label", "analysis_version"))


def mean(values: Iterable[Optional[float]]) -> Optional[float]:
    valid = [float(value) for value in values if value is not None]
    if not valid:
        return None
    return sum(valid) / len(valid)


def get_account_rows(limit: int = MAX_ACCOUNTS_PER_RUN, platform: Optional[str] = None) -> List[Dict[str, Any]]:
    params = {
        "select": "id,platform",
        "order": "id.asc",
        "limit": str(limit),
    }
    if platform:
        params["platform"] = f"eq.{platform}"
    elif PLATFORMS:
        params["platform"] = f"in.({','.join(PLATFORMS)})"
    return sb_get("sns_accounts", params, range_from=0, range_to=max(limit - 1, 0))


def get_posts_for_account(account_id: int, limit: int = POST_LIMIT) -> List[Dict[str, Any]]:
    select_fields = [field for field in ("id", "account_id", "posted_at", "scraped_at") if field in POSTS_COLUMNS]
    rows = sb_get(
        "posts",
        {
            "select": ",".join(select_fields),
            "account_id": f"eq.{account_id}",
            "order": "posted_at.desc,id.desc" if "posted_at" in POSTS_COLUMNS else "id.desc",
        },
        range_from=0,
        range_to=max(limit * 5 - 1, 0),
    )
    if WINDOW_DAYS > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
        filtered: List[Dict[str, Any]] = []
        for row in rows:
            when = parse_datetime(row.get("posted_at")) or parse_datetime(row.get("scraped_at"))
            if when and when < cutoff:
                continue
            filtered.append(row)
        rows = filtered
    return rows[:limit]


def get_post_quality_rows(post_ids: List[int]) -> List[Dict[str, Any]]:
    if not post_ids:
        return []
    rows: List[Dict[str, Any]] = []
    select_fields = [field for field in (
        "post_id",
        "unique_commenters",
        "avg_comments_per_commenter",
        "repeat_commenter_rate",
        "substantive_comment_rate",
        "question_rate",
        "low_signal_comment_rate",
        "suspicious_commenter_rate",
    ) if field in QUALITY_COLUMNS]
    for index in range(0, len(post_ids), 100):
        batch = post_ids[index:index + 100]
        rows.extend(
            sb_get(
                "post_commenter_quality_analysis",
                {
                    "select": ",".join(select_fields),
                    "analysis_version": f"eq.{ANALYSIS_VERSION}",
                    "post_id": f"in.({','.join(str(post_id) for post_id in batch)})",
                },
                range_from=0,
                range_to=max(len(batch) - 1, 0),
            )
        )
    return rows


def aggregate_for_account(account_id: int, platform: Optional[str] = None) -> Optional[Dict[str, Any]]:
    posts = get_posts_for_account(account_id, limit=POST_LIMIT)
    if not posts:
        return None
    post_ids = [int(post["id"]) for post in posts if post.get("id") is not None]
    rows = get_post_quality_rows(post_ids)
    if not rows:
        return None

    payload = {
        "account_id": account_id,
        "platform": platform,
        "window_label": WINDOW_LABEL,
        "avg_unique_commenters": mean(safe_float(row.get("unique_commenters")) for row in rows),
        "avg_comments_per_commenter": mean(safe_float(row.get("avg_comments_per_commenter")) for row in rows),
        "avg_repeat_commenter_rate": mean(safe_float(row.get("repeat_commenter_rate")) for row in rows),
        "avg_substantive_comment_rate": mean(safe_float(row.get("substantive_comment_rate")) for row in rows),
        "avg_question_rate": mean(safe_float(row.get("question_rate")) for row in rows),
        "avg_low_signal_comment_rate": mean(safe_float(row.get("low_signal_comment_rate")) for row in rows),
        "avg_suspicious_commenter_rate": mean(safe_float(row.get("suspicious_commenter_rate")) for row in rows),
        "posts_used": len(rows),
        "analysis_version": ANALYSIS_VERSION,
        "updated_at": utcnow_iso(),
    }
    payload = {key: value for key, value in payload.items() if key in SUMMARY_COLUMNS}
    upserted = sb_upsert("influencer_commenter_quality_summary", [payload], on_conflict="account_id,window_label,analysis_version")
    return upserted[0] if upserted else payload


def main() -> None:
    validate_runtime_schema()
    explicit_account_id = os.getenv("COMMENTER_QUALITY_SUMMARY_ACCOUNT_ID")
    platform_filter = env_str("COMMENTER_QUALITY_SUMMARY_PLATFORM", "").lower() or None

    if explicit_account_id and explicit_account_id.strip():
        account_id = int(explicit_account_id)
        row = aggregate_for_account(account_id, platform=platform_filter)
        if row:
            print(
                f"[OK] account_id={account_id} platform={platform_filter or 'all'} "
                f"posts_used={row.get('posts_used')} avg_unique_commenters={row.get('avg_unique_commenters')}"
            )
        else:
            print(f"[SKIP] account_id={account_id} no commenter quality rows")
        return

    accounts = get_account_rows(limit=MAX_ACCOUNTS_PER_RUN, platform=platform_filter)
    if not accounts:
        print("No accounts found for commenter quality summary.")
        return

    for row in accounts:
        account_id = int(row["id"])
        platform = str(row.get("platform") or "").strip().lower() or None
        summary = aggregate_for_account(account_id, platform=platform)
        if summary:
            print(f"[OK] platform={platform} account_id={account_id} posts_used={summary.get('posts_used')}")
        else:
            print(f"[SKIP] platform={platform} account_id={account_id} no commenter quality rows")


if __name__ == "__main__":
    main()
