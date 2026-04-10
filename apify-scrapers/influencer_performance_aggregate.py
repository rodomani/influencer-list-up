#!/usr/bin/env python3
import math
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from statistics import median
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

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


def env_float(key: str, default: float) -> float:
    value = os.getenv(key)
    return float(value) if value and value.strip() else default


def env_str(key: str, default: str) -> str:
    value = os.getenv(key)
    return value.strip() if value and value.strip() else default


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


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


def parse_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    dt = parse_datetime(value)
    if dt:
        return dt.date()
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
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


def safe_int(value: Any) -> Optional[int]:
    try:
        if value is None:
            return None
        if isinstance(value, bool):
            return int(value)
        return int(float(value))
    except Exception:
        return None


SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

SUPPORTED_PLATFORMS = ("instagram", "tiktok", "youtube", "x")
PLATFORMS = tuple(
    token.strip().lower()
    for token in env_str("PERFORMANCE_PLATFORMS", ",".join(SUPPORTED_PLATFORMS)).split(",")
    if token.strip().lower() in SUPPORTED_PLATFORMS
)

WINDOW_DAYS = env_int("PERFORMANCE_WINDOW_DAYS", 90)
WINDOW_LABEL = env_str("PERFORMANCE_WINDOW_LABEL", f"{WINDOW_DAYS}d" if WINDOW_DAYS > 0 else "all_time")
POST_LIMIT = env_int("PERFORMANCE_POST_LIMIT", 20)
MIN_POSTS = env_int("PERFORMANCE_MIN_POSTS", 5)
REFERENCE_AGE_DAYS = env_int("PERFORMANCE_REFERENCE_AGE_DAYS", 7)
REFERENCE_AGE_TOLERANCE_DAYS = env_int("PERFORMANCE_REFERENCE_AGE_TOLERANCE_DAYS", 3)
MAX_ACCOUNTS_PER_RUN = env_int("PERFORMANCE_MAX_ACCOUNTS_PER_RUN", 500)

RATE_ANCHOR_VIEWS = env_float("PERFORMANCE_RATE_ANCHOR_VIEWS", 0.06)
RATE_ANCHOR_FOLLOWERS = env_float("PERFORMANCE_RATE_ANCHOR_FOLLOWERS", 0.12)
RATE_ANCHOR_MIXED = env_float("PERFORMANCE_RATE_ANCHOR_MIXED", 0.08)
MOMENTUM_SCALE = env_float("PERFORMANCE_MOMENTUM_SCALE", 0.50)

LEVEL_WEIGHT = env_float("PERFORMANCE_LEVEL_WEIGHT", 0.45)
MOMENTUM_WEIGHT = env_float("PERFORMANCE_MOMENTUM_WEIGHT", 0.35)
CONSISTENCY_WEIGHT = env_float("PERFORMANCE_CONSISTENCY_WEIGHT", 0.20)


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


def sb_get(
    table: str,
    params: Dict[str, str],
    range_from: int = 0,
    range_to: int = 99,
) -> List[Dict[str, Any]]:
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


def chunked(values: Sequence[int], size: int) -> Iterable[List[int]]:
    for index in range(0, len(values), size):
        yield [int(value) for value in values[index:index + size]]


def supabase_table_columns(table: str) -> Set[str]:
    try:
        rows = sb_get(table, {"select": "*", "limit": "1"})
        if rows:
            return set(rows[0].keys())
    except Exception:
        pass

    if table == "posts":
        return {"id", "account_id", "posted_at", "scraped_at"}
    if table == "post_metrics_snapshots":
        return {
            "post_id",
            "captured_at",
            "created_at",
            "views",
            "likes",
            "comments_count",
            "duration_seconds",
            "like_view_rate",
            "comment_view_rate",
        }
    if table == "accounts_metrics":
        return {"account_id", "metric_date", "followers"}
    if table == "influencer_performance_summary":
        return {
            "account_id",
            "window",
            "engagement_trend_score",
            "engagement_level_score",
            "engagement_momentum_score",
            "engagement_consistency_score",
            "median_engagement_rate",
            "mean_engagement_rate",
            "posts_used",
            "sample_start_at",
            "sample_end_at",
            "basis",
            "updated_at",
            "created_at",
        }
    return set()


POSTS_COLUMNS = supabase_table_columns("posts")
SNAPSHOT_COLUMNS = supabase_table_columns("post_metrics_snapshots")
ACCOUNT_METRIC_COLUMNS = supabase_table_columns("accounts_metrics")
SUMMARY_COLUMNS = supabase_table_columns("influencer_performance_summary")


@dataclass
class PostSnapshotPoint:
    post_id: int
    snapshot_at: datetime
    likes: float
    comments_count: float
    views: float


@dataclass
class PostPerformancePoint:
    post_id: int
    posted_at: Optional[datetime]
    snapshot_at: datetime
    rate: float
    basis: str


def choose_snapshot_timestamp(row: Dict[str, Any]) -> Optional[datetime]:
    for key in ("captured_at", "created_at"):
        if key in row:
            dt = parse_datetime(row.get(key))
            if dt:
                return dt
    return None


def normalize_snapshot(row: Dict[str, Any]) -> Optional[PostSnapshotPoint]:
    post_id = safe_int(row.get("post_id"))
    snapshot_at = choose_snapshot_timestamp(row)
    if post_id is None or snapshot_at is None:
        return None

    comments_value = safe_float(row.get("comments_count")) or 0.0

    return PostSnapshotPoint(
        post_id=post_id,
        snapshot_at=snapshot_at,
        likes=safe_float(row.get("likes")) or 0.0,
        comments_count=comments_value,
        views=safe_float(row.get("views")) or 0.0,
    )


def weighted_engagement(point: PostSnapshotPoint) -> float:
    return point.likes + 2.0 * point.comments_count


def select_reference_snapshot(
    snapshots: List[PostSnapshotPoint],
    posted_at: Optional[datetime],
) -> Optional[PostSnapshotPoint]:
    if not snapshots:
        return None

    ordered = sorted(snapshots, key=lambda point: point.snapshot_at)
    if not posted_at:
        return ordered[-1]

    target = posted_at + timedelta(days=REFERENCE_AGE_DAYS)
    tolerance = timedelta(days=REFERENCE_AGE_TOLERANCE_DAYS)
    candidates = [
        point
        for point in ordered
        if abs(point.snapshot_at - target) <= tolerance
    ]
    if candidates:
        return min(candidates, key=lambda point: abs(point.snapshot_at - target))

    after_target = [point for point in ordered if point.snapshot_at >= target]
    if after_target:
        return min(after_target, key=lambda point: point.snapshot_at)

    return ordered[-1]


def nearest_followers(
    rows: Sequence[Dict[str, Any]],
    snapshot_at: datetime,
) -> Optional[float]:
    if not rows:
        return None

    snapshot_date = snapshot_at.date()
    before_or_same: List[Tuple[date, float]] = []
    after_rows: List[Tuple[date, float]] = []

    for row in rows:
        metric_date = parse_date(row.get("metric_date"))
        followers = safe_float(row.get("followers"))
        if metric_date is None or followers is None or followers <= 0:
            continue
        pair = (metric_date, followers)
        if metric_date <= snapshot_date:
            before_or_same.append(pair)
        else:
            after_rows.append(pair)

    if before_or_same:
        return sorted(before_or_same, key=lambda pair: pair[0])[-1][1]
    if after_rows:
        return sorted(after_rows, key=lambda pair: pair[0])[0][1]
    return None


def mean(values: Sequence[float]) -> Optional[float]:
    if not values:
        return None
    return sum(values) / len(values)


def standard_deviation(values: Sequence[float]) -> Optional[float]:
    if len(values) < 2:
        return None
    avg = sum(values) / len(values)
    variance = sum((value - avg) ** 2 for value in values) / len(values)
    return math.sqrt(variance)


def anchor_for_basis(basis: str) -> float:
    if basis == "views":
        return RATE_ANCHOR_VIEWS
    if basis == "followers":
        return RATE_ANCHOR_FOLLOWERS
    return RATE_ANCHOR_MIXED


def build_score_components(points: List[PostPerformancePoint]) -> Dict[str, Any]:
    rates = [point.rate for point in points]
    median_rate = median(rates)
    mean_rate = mean(rates)

    basis_values = {point.basis for point in points}
    if len(basis_values) == 1:
        basis = next(iter(basis_values))
    else:
        basis = "mixed"

    anchor = anchor_for_basis(basis)
    level_score = 100.0 * (1.0 - math.exp(-(median_rate / max(anchor, 1e-9))))
    level_score = clamp(level_score, 0.0, 100.0)

    ordered = sorted(
        points,
        key=lambda point: point.posted_at or point.snapshot_at,
        reverse=True,
    )
    midpoint = max(len(ordered) // 2, 1)
    recent_rates = [point.rate for point in ordered[:midpoint]]
    previous_rates = [point.rate for point in ordered[midpoint:]]

    if recent_rates and previous_rates:
        recent_median = median(recent_rates)
        previous_median = median(previous_rates)
        baseline = max(abs(previous_median), 1e-9)
        momentum_ratio = (recent_median - previous_median) / baseline
        momentum_score = 50.0 + 50.0 * math.tanh(momentum_ratio / max(MOMENTUM_SCALE, 1e-9))
    else:
        momentum_score = 50.0
    momentum_score = clamp(momentum_score, 0.0, 100.0)

    stdev = standard_deviation(rates)
    if stdev is None or not mean_rate or mean_rate <= 0:
        consistency_score = 100.0
    else:
        coefficient_of_variation = stdev / mean_rate
        consistency_score = 100.0 * (1.0 / (1.0 + coefficient_of_variation))
    consistency_score = clamp(consistency_score, 0.0, 100.0)

    final_score = (
        LEVEL_WEIGHT * level_score
        + MOMENTUM_WEIGHT * momentum_score
        + CONSISTENCY_WEIGHT * consistency_score
    )
    final_score = clamp(final_score, 0.0, 100.0)

    dated_points = [point for point in ordered if point.posted_at is not None]
    sample_start = min((point.posted_at for point in dated_points), default=None)
    sample_end = max((point.posted_at for point in dated_points), default=None)

    return {
        "engagement_trend_score": final_score,
        "engagement_level_score": level_score,
        "engagement_momentum_score": momentum_score,
        "engagement_consistency_score": consistency_score,
        "median_engagement_rate": median_rate,
        "mean_engagement_rate": mean_rate,
        "posts_used": len(points),
        "sample_start_at": sample_start.isoformat() if sample_start else None,
        "sample_end_at": sample_end.isoformat() if sample_end else None,
        "basis": basis,
    }


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


def get_posts_for_account(account_id: int) -> List[Dict[str, Any]]:
    select_fields = ["id", "account_id"]
    for optional_field in ("posted_at", "scraped_at"):
        if optional_field in POSTS_COLUMNS:
            select_fields.append(optional_field)

    rows = sb_get(
        "posts",
        {
            "select": ",".join(select_fields),
            "account_id": f"eq.{account_id}",
            "order": "posted_at.desc,id.desc" if "posted_at" in POSTS_COLUMNS else "id.desc",
        },
        range_from=0,
        range_to=max(POST_LIMIT * 5 - 1, 0),
    )

    if WINDOW_DAYS > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
        filtered: List[Dict[str, Any]] = []
        for row in rows:
            posted_at = parse_datetime(row.get("posted_at")) or parse_datetime(row.get("scraped_at"))
            if posted_at and posted_at < cutoff:
                continue
            filtered.append(row)
        rows = filtered

    return rows[:POST_LIMIT]


def get_snapshots_for_posts(post_ids: List[int]) -> Dict[int, List[PostSnapshotPoint]]:
    if not post_ids:
        return {}

    snapshot_fields = [field for field in (
        "post_id",
        "captured_at",
        "created_at",
        "views",
        "likes",
        "comments_count",
        "duration_seconds",
        "like_view_rate",
        "comment_view_rate",
    ) if field in SNAPSHOT_COLUMNS]

    rows: List[Dict[str, Any]] = []
    for batch in chunked(post_ids, 100):
        rows.extend(
            sb_get(
                "post_metrics_snapshots",
                {
                    "select": ",".join(snapshot_fields),
                    "post_id": f"in.({','.join(str(post_id) for post_id in batch)})",
                    "order": "captured_at.desc,created_at.desc"
                    if "captured_at" in SNAPSHOT_COLUMNS
                    else "created_at.desc",
                },
                range_from=0,
                range_to=5000,
            )
        )

    by_post: Dict[int, List[PostSnapshotPoint]] = {}
    for row in rows:
        point = normalize_snapshot(row)
        if not point:
            continue
        by_post.setdefault(point.post_id, []).append(point)
    return by_post


def get_account_metrics(account_id: int) -> List[Dict[str, Any]]:
    select_fields = [field for field in ("account_id", "metric_date", "followers") if field in ACCOUNT_METRIC_COLUMNS]
    if len(select_fields) < 3:
        return []

    rows = sb_get(
        "accounts_metrics",
        {
            "select": ",".join(select_fields),
            "account_id": f"eq.{account_id}",
            "order": "metric_date.asc",
        },
        range_from=0,
        range_to=1000,
    )
    return rows


def build_post_performance_points(account_id: int) -> List[PostPerformancePoint]:
    posts = get_posts_for_account(account_id)
    if not posts:
        return []

    post_ids = [int(row["id"]) for row in posts if row.get("id") is not None]
    snapshots_by_post = get_snapshots_for_posts(post_ids)
    account_metric_rows = get_account_metrics(account_id)

    performance_points: List[PostPerformancePoint] = []
    for row in posts:
        post_id = safe_int(row.get("id"))
        if post_id is None:
            continue
        snapshots = snapshots_by_post.get(post_id) or []
        selected = select_reference_snapshot(
            snapshots,
            parse_datetime(row.get("posted_at")),
        )
        if not selected:
            continue

        numerator = weighted_engagement(selected)
        if numerator <= 0:
            continue

        basis = "views"
        denominator = selected.views if selected.views > 0 else None
        if denominator is None or denominator <= 0:
            denominator = nearest_followers(account_metric_rows, selected.snapshot_at)
            basis = "followers"

        if denominator is None or denominator <= 0:
            continue

        rate = numerator / denominator
        performance_points.append(
            PostPerformancePoint(
                post_id=post_id,
                posted_at=parse_datetime(row.get("posted_at")),
                snapshot_at=selected.snapshot_at,
                rate=rate,
                basis=basis,
            )
        )

    ordered = sorted(
        performance_points,
        key=lambda point: point.posted_at or point.snapshot_at,
        reverse=True,
    )
    return ordered[:POST_LIMIT]


def payload_for_summary(account_id: int, points: List[PostPerformancePoint]) -> Optional[Dict[str, Any]]:
    if len(points) < MIN_POSTS:
        return None

    scores = build_score_components(points)
    payload = {
        "account_id": account_id,
        "window": WINDOW_LABEL,
        "updated_at": utcnow_iso(),
        **scores,
    }
    return {key: value for key, value in payload.items() if key in SUMMARY_COLUMNS}


def aggregate_performance_for_account(account_id: int, platform: Optional[str] = None) -> Optional[Dict[str, Any]]:
    points = build_post_performance_points(account_id)
    payload = payload_for_summary(account_id, points)
    if not payload:
        return None

    upserted = sb_upsert("influencer_performance_summary", [payload], on_conflict="account_id,window")
    if upserted:
        return upserted[0]
    return payload


def main() -> None:
    explicit_account_id = safe_int(os.getenv("PERFORMANCE_ACCOUNT_ID"))
    platform_filter = env_str("PERFORMANCE_PLATFORM", "").lower() or None

    if explicit_account_id is not None:
        row = aggregate_performance_for_account(explicit_account_id, platform=platform_filter)
        if row:
            print(
                f"[OK] account_id={explicit_account_id} window={row.get('window')} "
                f"score={row.get('engagement_trend_score'):.2f} posts_used={row.get('posts_used')}"
            )
        else:
            print(f"[SKIP] account_id={explicit_account_id} insufficient data")
        return

    accounts = get_account_rows(limit=MAX_ACCOUNTS_PER_RUN, platform=platform_filter)
    if not accounts:
        print("No accounts found for influencer performance aggregation.")
        return

    for row in accounts:
        account_id = int(row["id"])
        result = aggregate_performance_for_account(account_id, platform=row.get("platform"))
        if result:
            print(
                f"[OK] platform={row.get('platform')} account_id={account_id} "
                f"score={result.get('engagement_trend_score'):.2f} posts_used={result.get('posts_used')}"
            )
        else:
            print(f"[SKIP] platform={row.get('platform')} account_id={account_id} insufficient data")


if __name__ == "__main__":
    main()
