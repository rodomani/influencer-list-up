#!/usr/bin/env python3
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
    for token in env_str("GROWTH_ANOMALY_PLATFORMS", ",".join(SUPPORTED_PLATFORMS)).split(",")
    if token.strip().lower() in SUPPORTED_PLATFORMS
)

WINDOW_DAYS = env_int("GROWTH_ANOMALY_WINDOW_DAYS", 90)
WINDOW_LABEL = env_str("GROWTH_ANOMALY_WINDOW_LABEL", f"{WINDOW_DAYS}d" if WINDOW_DAYS > 0 else "all_time")
BASELINE_DAYS = env_int("GROWTH_ANOMALY_BASELINE_DAYS", 30)
MAX_ACCOUNTS_PER_RUN = env_int("GROWTH_ANOMALY_MAX_ACCOUNTS_PER_RUN", 500)
MIN_HISTORY_POINTS = env_int("GROWTH_ANOMALY_MIN_HISTORY_POINTS", max(BASELINE_DAYS + 2, 14))
MAX_METRIC_AGE_DAYS = env_int("GROWTH_ANOMALY_MAX_METRIC_AGE_DAYS", 3)
MIN_ABS_DELTA = env_float("GROWTH_ANOMALY_MIN_ABS_DELTA", 20.0)
MIN_REL_DELTA = env_float("GROWTH_ANOMALY_MIN_REL_DELTA", 0.002)
MAD_FLOOR = env_float("GROWTH_ANOMALY_MAD_FLOOR", 5.0)
ROBUST_Z_THRESHOLD = env_float("GROWTH_ANOMALY_Z_THRESHOLD", 3.5)
FLATLINE_MAX_ABS_DELTA = env_float("GROWTH_ANOMALY_FLATLINE_MAX_ABS_DELTA", 1.0)
FLATLINE_MIN_BASELINE_DELTA = env_float("GROWTH_ANOMALY_FLATLINE_MIN_BASELINE_DELTA", 50.0)
ANALYSIS_VERSION = env_str("GROWTH_ANOMALY_ANALYSIS_VERSION", "v1")


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


def sb_delete(table: str, params: Dict[str, str]) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = sb_headers("return=minimal")
    response = requests.delete(url, params=params, headers=headers, timeout=60)
    if not response.ok:
        raise RuntimeError(f"DELETE {table} failed: {response.status_code} {response.text[:800]}")


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

    if table == "sns_accounts":
        return {"id", "platform"}
    if table == "accounts_metrics":
        return {"account_id", "metric_date", "followers"}
    if table == "account_growth_anomaly_events":
        return {
            "account_id",
            "platform",
            "metric_date",
            "followers",
            "follower_delta",
            "follower_pct_change",
            "baseline_median_delta",
            "baseline_mad",
            "robust_z_score",
            "anomaly_type",
            "severity_score",
            "analysis_version",
            "created_at",
            "updated_at",
        }
    if table == "influencer_growth_anomaly_summary":
        return {
            "account_id",
            "platform",
            "window_label",
            "growth_anomaly_score",
            "analysis_status",
            "latest_anomaly_type",
            "latest_anomaly_date",
            "latest_metric_date",
            "anomaly_events_count",
            "recent_spike_count",
            "recent_drop_count",
            "recent_flatline_count",
            "max_severity_score",
            "analysis_version",
            "created_at",
            "updated_at",
        }
    if table == "analysis_unique_indexes":
        return {"table_name", "tablename", "index_name", "indexname", "indexdef"}
    return set()


ACCOUNT_COLUMNS = supabase_table_columns("sns_accounts")
ACCOUNT_METRIC_COLUMNS = supabase_table_columns("accounts_metrics")
EVENT_COLUMNS = supabase_table_columns("account_growth_anomaly_events")
SUMMARY_COLUMNS = supabase_table_columns("influencer_growth_anomaly_summary")
INDEX_COLUMNS = supabase_table_columns("analysis_unique_indexes")


@dataclass
class GrowthPoint:
    metric_date: date
    followers: float
    delta: float
    pct_change: float


@dataclass
class GrowthEvent:
    metric_date: date
    followers: float
    delta: float
    pct_change: float
    baseline_median_delta: float
    baseline_mad: float
    robust_z_score: float
    anomaly_type: str
    severity_score: float


def median_absolute_deviation(values: Sequence[float], center: float) -> float:
    if not values:
        return 0.0
    deviations = [abs(value - center) for value in values]
    return float(median(deviations))


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
    validate_required_columns("accounts_metrics", ACCOUNT_METRIC_COLUMNS, {"account_id", "metric_date", "followers"})
    validate_required_columns(
        "account_growth_anomaly_events",
        EVENT_COLUMNS,
        {"account_id", "platform", "metric_date", "anomaly_type", "severity_score", "analysis_version", "updated_at"},
    )
    validate_required_columns(
        "influencer_growth_anomaly_summary",
        SUMMARY_COLUMNS,
        {"account_id", "platform", "window_label", "growth_anomaly_score", "analysis_status", "analysis_version", "updated_at"},
    )
    validate_unique_index("account_growth_anomaly_events", ("account_id", "metric_date", "analysis_version"))
    validate_unique_index("influencer_growth_anomaly_summary", ("account_id", "window_label", "analysis_version"))


def severity_from_robust_z(robust_z_score: float, anomaly_type: str) -> float:
    base = abs(robust_z_score) * 12.0
    if anomaly_type == "drop":
        base += 6.0
    if anomaly_type == "flatline":
        base += 3.0
    return clamp(base, 0.0, 100.0)


def anomaly_floor(previous_followers: float) -> float:
    return max(MIN_ABS_DELTA, previous_followers * MIN_REL_DELTA)


def get_account_rows(limit: int = MAX_ACCOUNTS_PER_RUN, platform: Optional[str] = None) -> List[Dict[str, Any]]:
    select_fields = [field for field in ("id", "platform") if field in ACCOUNT_COLUMNS]
    params = {
        "select": ",".join(select_fields) if select_fields else "id",
        "order": "id.asc",
        "limit": str(limit),
    }
    if platform:
        params["platform"] = f"eq.{platform}"
    elif PLATFORMS and "platform" in ACCOUNT_COLUMNS:
        params["platform"] = f"in.({','.join(PLATFORMS)})"
    return sb_get("sns_accounts", params, range_from=0, range_to=max(limit - 1, 0))


def get_account_row(account_id: int) -> Optional[Dict[str, Any]]:
    rows = sb_get(
        "sns_accounts",
        {
            "select": ",".join(field for field in ("id", "platform") if field in ACCOUNT_COLUMNS) or "id",
            "id": f"eq.{account_id}",
            "limit": "1",
        },
        range_from=0,
        range_to=0,
    )
    return rows[0] if rows else None


def get_account_metric_rows(account_id: int) -> List[Dict[str, Any]]:
    select_fields = [field for field in ("account_id", "metric_date", "followers") if field in ACCOUNT_METRIC_COLUMNS]
    if len(select_fields) < 3:
        return []

    rows: List[Dict[str, Any]] = []
    offset = 0
    page_size = 1000
    while True:
        batch = sb_get(
            "accounts_metrics",
            {
                "select": ",".join(select_fields),
                "account_id": f"eq.{account_id}",
                "order": "metric_date.asc",
            },
            range_from=offset,
            range_to=offset + page_size - 1,
        )
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def build_growth_points(rows: Sequence[Dict[str, Any]]) -> List[GrowthPoint]:
    ordered_rows = sorted(
        rows,
        key=lambda row: parse_date(row.get("metric_date")) or date.min,
    )
    points: List[GrowthPoint] = []
    previous_date: Optional[date] = None
    previous_followers: Optional[float] = None

    for row in ordered_rows:
        metric_date = parse_date(row.get("metric_date"))
        followers = safe_float(row.get("followers"))
        if metric_date is None or followers is None or followers < 0:
            continue
        if previous_date == metric_date:
            previous_followers = followers
            continue
        if previous_followers is not None:
            delta = followers - previous_followers
            pct_change = (delta / previous_followers) if previous_followers > 0 else 0.0
            points.append(
                GrowthPoint(
                    metric_date=metric_date,
                    followers=followers,
                    delta=delta,
                    pct_change=pct_change,
                )
            )
        previous_date = metric_date
        previous_followers = followers

    if WINDOW_DAYS <= 0:
        return points

    cutoff = datetime.now(timezone.utc).date() - timedelta(days=WINDOW_DAYS + BASELINE_DAYS + 2)
    return [point for point in points if point.metric_date >= cutoff]


def detect_growth_events(points: Sequence[GrowthPoint]) -> List[GrowthEvent]:
    if len(points) < MIN_HISTORY_POINTS:
        return []

    analyze_cutoff = None
    if WINDOW_DAYS > 0:
        analyze_cutoff = datetime.now(timezone.utc).date() - timedelta(days=WINDOW_DAYS)

    events: List[GrowthEvent] = []
    for index, point in enumerate(points):
        if analyze_cutoff and point.metric_date < analyze_cutoff:
            continue

        start_index = max(0, index - BASELINE_DAYS)
        baseline_window = [candidate.delta for candidate in points[start_index:index]]
        if len(baseline_window) < max(7, min(BASELINE_DAYS, 7)):
            continue

        median_delta = float(median(baseline_window))
        mad = median_absolute_deviation(baseline_window, median_delta)
        scaled_mad = 1.4826 * max(mad, MAD_FLOOR)
        robust_z_score = (point.delta - median_delta) / scaled_mad if scaled_mad > 0 else 0.0

        previous_followers = max(point.followers - point.delta, 0.0)
        delta_floor = anomaly_floor(previous_followers)

        anomaly_type: Optional[str] = None
        if point.delta >= delta_floor and robust_z_score >= ROBUST_Z_THRESHOLD:
            anomaly_type = "spike"
        elif point.delta <= -delta_floor and robust_z_score <= -ROBUST_Z_THRESHOLD:
            anomaly_type = "drop"
        elif (
            abs(point.delta) <= FLATLINE_MAX_ABS_DELTA
            and median_delta >= max(FLATLINE_MIN_BASELINE_DELTA, delta_floor)
        ):
            anomaly_type = "flatline"

        if not anomaly_type:
            continue

        severity_score = severity_from_robust_z(robust_z_score, anomaly_type)
        events.append(
            GrowthEvent(
                metric_date=point.metric_date,
                followers=point.followers,
                delta=point.delta,
                pct_change=point.pct_change,
                baseline_median_delta=median_delta,
                baseline_mad=mad,
                robust_z_score=robust_z_score,
                anomaly_type=anomaly_type,
                severity_score=severity_score,
            )
        )

    return events


def payload_for_event(account_id: int, platform: str, event: GrowthEvent) -> Dict[str, Any]:
    payload = {
        "account_id": account_id,
        "platform": platform,
        "metric_date": event.metric_date.isoformat(),
        "followers": int(round(event.followers)),
        "follower_delta": int(round(event.delta)),
        "follower_pct_change": event.pct_change,
        "baseline_median_delta": event.baseline_median_delta,
        "baseline_mad": event.baseline_mad,
        "robust_z_score": event.robust_z_score,
        "anomaly_type": event.anomaly_type,
        "severity_score": event.severity_score,
        "analysis_version": ANALYSIS_VERSION,
        "updated_at": utcnow_iso(),
    }
    return {key: value for key, value in payload.items() if key in EVENT_COLUMNS}


def growth_anomaly_score(events: Sequence[GrowthEvent]) -> float:
    if not events:
        return 0.0

    recent_spikes = sum(1 for event in events if event.anomaly_type == "spike")
    recent_drops = sum(1 for event in events if event.anomaly_type == "drop")
    recent_flatlines = sum(1 for event in events if event.anomaly_type == "flatline")
    max_severity = max(event.severity_score for event in events)

    score = (
        0.60 * max_severity
        + 8.0 * len(events)
        + 6.0 * recent_drops
        + 4.0 * recent_spikes
        + 3.0 * recent_flatlines
    )
    return clamp(score, 0.0, 100.0)


def payload_for_summary(account_id: int, platform: str, events: Sequence[GrowthEvent]) -> Dict[str, Any]:
    latest = max(events, key=lambda event: event.metric_date) if events else None
    payload = {
        "account_id": account_id,
        "platform": platform,
        "window_label": WINDOW_LABEL,
        "growth_anomaly_score": growth_anomaly_score(events),
        "analysis_status": "ok",
        "latest_anomaly_type": latest.anomaly_type if latest else None,
        "latest_anomaly_date": latest.metric_date.isoformat() if latest else None,
        "anomaly_events_count": len(events),
        "recent_spike_count": sum(1 for event in events if event.anomaly_type == "spike"),
        "recent_drop_count": sum(1 for event in events if event.anomaly_type == "drop"),
        "recent_flatline_count": sum(1 for event in events if event.anomaly_type == "flatline"),
        "max_severity_score": max((event.severity_score for event in events), default=0.0),
        "analysis_version": ANALYSIS_VERSION,
        "updated_at": utcnow_iso(),
    }
    return {key: value for key, value in payload.items() if key in SUMMARY_COLUMNS}


def payload_for_summary_status(
    account_id: int,
    platform: str,
    analysis_status: str,
    latest_metric_date: Optional[date],
) -> Dict[str, Any]:
    payload = {
        "account_id": account_id,
        "platform": platform,
        "window_label": WINDOW_LABEL,
        "growth_anomaly_score": 0.0,
        "analysis_status": analysis_status,
        "latest_anomaly_type": None,
        "latest_anomaly_date": None,
        "latest_metric_date": latest_metric_date.isoformat() if latest_metric_date else None,
        "anomaly_events_count": 0,
        "recent_spike_count": 0,
        "recent_drop_count": 0,
        "recent_flatline_count": 0,
        "max_severity_score": 0.0,
        "analysis_version": ANALYSIS_VERSION,
        "updated_at": utcnow_iso(),
    }
    return {key: value for key, value in payload.items() if key in SUMMARY_COLUMNS}


def upsert_summary(payload: Dict[str, Any]) -> Dict[str, Any]:
    upserted = sb_upsert(
        "influencer_growth_anomaly_summary",
        [payload],
        on_conflict="account_id,window_label,analysis_version",
    )
    return upserted[0] if upserted else payload


def sync_events_for_account(account_id: int, platform: str, events: Sequence[GrowthEvent]) -> int:
    rows = [payload_for_event(account_id, platform, event) for event in events]
    if rows:
        sb_upsert("account_growth_anomaly_events", rows, on_conflict="account_id,metric_date,analysis_version")
        keep_dates = ",".join(row["metric_date"] for row in rows if row.get("metric_date"))
        if keep_dates:
            sb_delete(
                "account_growth_anomaly_events",
                {
                    "account_id": f"eq.{account_id}",
                    "analysis_version": f"eq.{ANALYSIS_VERSION}",
                    "metric_date": f"not.in.({keep_dates})",
                },
            )
    else:
        sb_delete(
            "account_growth_anomaly_events",
            {
                "account_id": f"eq.{account_id}",
                "analysis_version": f"eq.{ANALYSIS_VERSION}",
            },
        )
    return len(rows)


def analyze_account(account_id: int, platform: str) -> Dict[str, Any]:
    rows = get_account_metric_rows(account_id)
    points = build_growth_points(rows)
    latest_metric_date = max((point.metric_date for point in points), default=None)
    if not points:
        summary = upsert_summary(payload_for_summary_status(account_id, platform, "no_metrics", latest_metric_date))
        return {
            "account_id": account_id,
            "platform": platform,
            "history_points": 0,
            "events_written": 0,
            "analysis_status": "no_metrics",
            **summary,
        }
    if latest_metric_date and latest_metric_date < (datetime.now(timezone.utc).date() - timedelta(days=MAX_METRIC_AGE_DAYS)):
        summary = upsert_summary(payload_for_summary_status(account_id, platform, "stale_source_data", latest_metric_date))
        return {
            "account_id": account_id,
            "platform": platform,
            "history_points": len(points),
            "events_written": 0,
            "analysis_status": "stale_source_data",
            **summary,
        }
    if len(points) < MIN_HISTORY_POINTS:
        summary = upsert_summary(payload_for_summary_status(account_id, platform, "insufficient_history", latest_metric_date))
        return {
            "account_id": account_id,
            "platform": platform,
            "history_points": len(points),
            "events_written": 0,
            "analysis_status": "insufficient_history",
            **summary,
        }

    events = detect_growth_events(points)
    events_written = sync_events_for_account(account_id, platform, events)
    summary_payload = payload_for_summary(account_id, platform, events)
    if "latest_metric_date" in SUMMARY_COLUMNS:
        summary_payload["latest_metric_date"] = latest_metric_date.isoformat() if latest_metric_date else None
    summary = upsert_summary(summary_payload)
    return {
        "account_id": account_id,
        "platform": platform,
        "history_points": len(points),
        "events_written": events_written,
        "analysis_status": "ok",
        **summary,
    }


def main() -> None:
    validate_runtime_schema()
    explicit_account_id = safe_int(os.getenv("GROWTH_ANOMALY_ACCOUNT_ID"))
    platform_filter = env_str("GROWTH_ANOMALY_PLATFORM", "").lower() or None

    if explicit_account_id is not None:
        account_row = get_account_row(explicit_account_id)
        platform = platform_filter or (str(account_row.get("platform")).lower() if account_row and account_row.get("platform") else "")
        if not platform:
            raise RuntimeError(f"Could not determine platform for account_id={explicit_account_id}")

        result = analyze_account(explicit_account_id, platform)
        print(
            f"[OK] account_id={explicit_account_id} platform={platform} "
            f"status={result.get('analysis_status')} history_points={result.get('history_points')} "
            f"events={result.get('events_written')} score={float(result.get('growth_anomaly_score') or 0.0):.2f}"
        )
        return

    accounts = get_account_rows(limit=MAX_ACCOUNTS_PER_RUN, platform=platform_filter)
    if not accounts:
        print("No accounts found for growth anomaly analysis.")
        return

    for row in accounts:
        account_id = int(row["id"])
        platform = str(row.get("platform") or platform_filter or "").lower()
        if not platform:
            print(f"[SKIP] account_id={account_id} missing platform")
            continue

        result = analyze_account(account_id, platform)
        print(
            f"[OK] platform={platform} account_id={account_id} "
            f"status={result.get('analysis_status')} history_points={result.get('history_points')} "
            f"events={result.get('events_written')} score={float(result.get('growth_anomaly_score') or 0.0):.2f}"
        )


if __name__ == "__main__":
    main()
