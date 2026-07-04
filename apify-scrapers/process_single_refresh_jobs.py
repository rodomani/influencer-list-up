#!/usr/bin/env python3
"""
Process queued single-influencer refresh jobs.

The frontend button creates rows in analysis_job_runs with:
  analysis_name = single_influencer_refresh
  status = queued

Run this script from cron to process those jobs without hosting a separate API:
  python3 apify-scrapers/process_single_refresh_jobs.py --limit 3

Run continuously while developing:
  python3 apify-scrapers/process_single_refresh_jobs.py --watch --sleep-seconds 60
"""

import argparse
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from single_influencer_refresh import (
    SUPABASE,
    filter_columns,
    refresh_single_influencer,
    utcnow_iso,
)

ANALYSIS_NAME = "single_influencer_refresh"
PROVIDER_RUN_ID_RE = re.compile(r"run ID:\s*([A-Za-z0-9_-]+)", re.IGNORECASE)
PROVIDER_STATUS_RE = re.compile(r"status:\s*([A-Z_]+)", re.IGNORECASE)
PROVIDER_ERROR_TYPE_RE = re.compile(r'"type"\s*:\s*"([^"]+)"', re.IGNORECASE)


def iso_to_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def job_details(job: Dict[str, Any]) -> Dict[str, Any]:
    details = job.get("details")
    return details if isinstance(details, dict) else {}


def retry_count(job: Dict[str, Any]) -> int:
    value = job_details(job).get("retry_count")
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return max(value, 0)
    try:
        return max(int(value), 0)
    except Exception:
        return 0


def with_retry_details(
    job: Dict[str, Any],
    *,
    retry_count_value: Optional[int] = None,
    retry_reason: Optional[str] = None,
    max_retries: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    current_retry_count = retry_count(job) if retry_count_value is None else max(retry_count_value, 0)
    details = {
        **job_details(job),
        "retry_count": current_retry_count,
    }
    if retry_reason:
        details["last_retry_reason"] = retry_reason
        details["last_retried_at"] = utcnow_iso()
    if max_retries is not None:
        details["max_retries"] = max_retries
    if extra:
        details.update(extra)
    return details


def build_failure_monitoring(error: Exception) -> Dict[str, Any]:
    message = str(error)
    lower = message.lower()
    run_id_match = PROVIDER_RUN_ID_RE.search(message)
    status_match = PROVIDER_STATUS_RE.search(message)
    type_match = PROVIDER_ERROR_TYPE_RE.search(message)

    if "failedinput" in lower or "must contain" in lower or "invalid input" in lower:
        category = "invalid_input"
        user_message = "更新先の入力情報が正しく認識されませんでした。アカウント名またはURLを確認してください。"
        retryable = False
    elif "private" in lower or "not found" in lower or "deleted" in lower or "no items" in lower:
        category = "account_unavailable"
        user_message = "アカウントが非公開、削除済み、または取得できない状態の可能性があります。"
        retryable = False
    elif "timeout" in lower or "read timed out" in lower or "connection" in lower:
        category = "network_timeout"
        user_message = "外部データ取得がタイムアウトしました。時間をおいて再試行してください。"
        retryable = True
    elif "rate" in lower or "too many" in lower or "429" in lower:
        category = "rate_limited"
        user_message = "短時間の取得回数が多すぎます。しばらく待ってから再試行してください。"
        retryable = True
    elif "401" in lower or "403" in lower or "token" in lower or "unauthorized" in lower:
        category = "credential_or_permission"
        user_message = "データ取得の認証または権限設定に問題があります。環境変数とトークンを確認してください。"
        retryable = False
    elif "actor run did not succeed" in lower or "run-failed" in lower:
        category = "provider_run_failed"
        user_message = "外部データ取得処理が失敗しました。詳細ログを確認して再試行してください。"
        retryable = True
    else:
        category = "unknown"
        user_message = "更新処理で不明なエラーが発生しました。ログを確認してください。"
        retryable = True

    return {
        "category": category,
        "user_message": user_message,
        "retryable": retryable,
        "provider_run_id": run_id_match.group(1) if run_id_match else None,
        "provider_status": status_match.group(1).upper() if status_match else None,
        "provider_error_type": type_match.group(1) if type_match else None,
        "raw_error": message[:1000],
    }


def claim_queued_jobs(limit: int) -> List[Dict[str, Any]]:
    if limit <= 0:
        return []
    rows = SUPABASE.rpc("claim_single_influencer_refresh_jobs", {"job_limit": limit})
    return rows if isinstance(rows, list) else []


def fetch_stale_running_jobs(stale_minutes: int, limit: int) -> List[Dict[str, Any]]:
    if stale_minutes <= 0 or limit <= 0:
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    rows = SUPABASE.get(
        "analysis_job_runs",
        {
            "select": "id,account_id,platform,status,details,started_at,finished_at,created_at",
            "analysis_name": f"eq.{ANALYSIS_NAME}",
            "status": "eq.running",
            "order": "started_at.asc",
            "limit": str(limit),
        },
        range_from=0,
        range_to=limit - 1,
    )
    return [
        row
        for row in rows
        if (iso_to_dt(row.get("started_at")) or iso_to_dt(row.get("created_at")) or cutoff) < cutoff
    ]


def fetch_failed_jobs(limit: int) -> List[Dict[str, Any]]:
    if limit <= 0:
        return []
    return SUPABASE.get(
        "analysis_job_runs",
        {
            "select": "id,account_id,platform,status,details,started_at,finished_at,created_at",
            "analysis_name": f"eq.{ANALYSIS_NAME}",
            "status": "eq.failed",
            "order": "finished_at.desc",
            "limit": str(limit),
        },
        range_from=0,
        range_to=limit - 1,
    )


def update_job(job_id: int, fields: Dict[str, Any]) -> None:
    payload = filter_columns("analysis_job_runs", fields)
    SUPABASE.patch("analysis_job_runs", {"id": f"eq.{job_id}"}, payload)


def attach_running_metadata(job: Dict[str, Any]) -> str:
    started_at = str(job.get("started_at") or utcnow_iso())
    current_retry_count = retry_count(job)
    update_job(
        int(job["id"]),
        {
            "details": with_retry_details(
                job,
                retry_count_value=current_retry_count,
                extra={
                    "processor": "process_single_refresh_jobs.py",
                    "attempt_number": current_retry_count + 1,
                },
            ),
        },
    )
    return started_at


def mark_completed(
    job: Dict[str, Any],
    *,
    started_at: str,
    result: Dict[str, Any],
    include_posts: bool,
) -> None:
    update_job(
        int(job["id"]),
        {
            "status": "completed",
            "rows_written": result.get("rows_written"),
            "error_message": None,
            "details": with_retry_details(
                job,
                extra={
                    "processor": "process_single_refresh_jobs.py",
                    "include_posts": include_posts,
                    "refresh_result": result,
                },
            ),
            "started_at": started_at,
            "finished_at": utcnow_iso(),
        },
    )


def mark_failed(
    job: Dict[str, Any],
    *,
    started_at: str,
    error: Exception,
    include_posts: bool,
) -> None:
    failure_monitoring = build_failure_monitoring(error)
    update_job(
        int(job["id"]),
        {
            "status": "failed",
            "error_message": str(error)[:1000],
            "details": with_retry_details(
                job,
                extra={
                    "processor": "process_single_refresh_jobs.py",
                    "include_posts": include_posts,
                    "failure_monitoring": failure_monitoring,
                },
            ),
            "started_at": started_at,
            "finished_at": utcnow_iso(),
        },
    )


def resolve_include_posts(job: Dict[str, Any], override: Optional[bool]) -> bool:
    if override is not None:
        return override
    details = job_details(job)
    return details.get("include_posts") is not False


def process_job(job: Dict[str, Any], *, include_posts_override: Optional[bool]) -> bool:
    job_id = int(job["id"])
    account_id = job.get("account_id")
    if account_id is None:
        started_at = attach_running_metadata(job)
        mark_failed(
            job,
            started_at=started_at,
            error=RuntimeError("Queued refresh job is missing account_id."),
            include_posts=False,
        )
        print(f"job={job_id} failed: missing account_id")
        return False

    include_posts = resolve_include_posts(job, include_posts_override)
    started_at = attach_running_metadata(job)

    try:
        print(f"job={job_id} account_id={account_id} refresh started include_posts={include_posts}")
        result = refresh_single_influencer(
            int(account_id),
            include_posts=include_posts,
            record_runs=False,
        )
        mark_completed(job, started_at=started_at, result=result, include_posts=include_posts)
        print(f"job={job_id} account_id={account_id} completed rows_written={result.get('rows_written')}")
        return True
    except Exception as exc:
        mark_failed(job, started_at=started_at, error=exc, include_posts=include_posts)
        print(f"job={job_id} account_id={account_id} failed: {exc}")
        return False


def process_once(
    *,
    limit: int,
    include_posts_override: Optional[bool],
    retry_stale_running_minutes: int,
    retry_failed: bool,
    max_retries: int,
) -> int:
    stale_jobs = fetch_stale_running_jobs(retry_stale_running_minutes, limit)
    for job in stale_jobs:
        next_retry_count = retry_count(job) + 1
        if max_retries >= 0 and next_retry_count > max_retries:
            update_job(
                int(job["id"]),
                {
                    "status": "failed",
                    "error_message": f"Retry limit reached after stale running job exceeded {retry_stale_running_minutes} minutes.",
                    "details": with_retry_details(
                        job,
                        retry_count_value=retry_count(job),
                        max_retries=max_retries,
                        extra={
                            "retry_limit_reached": True,
                            "retry_limit_reason": "stale_running",
                        },
                    ),
                    "finished_at": utcnow_iso(),
                },
            )
            continue

        update_job(
            int(job["id"]),
            {
                "status": "queued",
                "error_message": None,
                "details": with_retry_details(
                    job,
                    retry_count_value=next_retry_count,
                    retry_reason="stale_running",
                    max_retries=max_retries,
                    extra={
                        "requeued_after_stale_running_minutes": retry_stale_running_minutes,
                    },
                ),
                "finished_at": None,
            },
        )

    if retry_failed:
        for job in fetch_failed_jobs(limit):
            monitoring = job_details(job).get("failure_monitoring")
            retryable = not isinstance(monitoring, dict) or monitoring.get("retryable") is not False
            next_retry_count = retry_count(job) + 1

            if not retryable:
                update_job(
                    int(job["id"]),
                    {
                        "details": with_retry_details(
                            job,
                            retry_count_value=retry_count(job),
                            max_retries=max_retries,
                            extra={
                                "retry_skipped": True,
                                "retry_skip_reason": "not_retryable",
                            },
                        ),
                    },
                )
                continue

            if max_retries >= 0 and next_retry_count > max_retries:
                update_job(
                    int(job["id"]),
                    {
                        "details": with_retry_details(
                            job,
                            retry_count_value=retry_count(job),
                            max_retries=max_retries,
                            extra={
                                "retry_limit_reached": True,
                                "retry_limit_reason": "failed_job",
                            },
                        ),
                    },
                )
                continue

            update_job(
                int(job["id"]),
                {
                    "status": "queued",
                    "error_message": None,
                    "details": with_retry_details(
                        job,
                        retry_count_value=next_retry_count,
                        retry_reason="failed_job",
                        max_retries=max_retries,
                        extra={
                            "requeued_from_failed": True,
                        },
                    ),
                    "finished_at": None,
                },
            )

    jobs = claim_queued_jobs(limit)
    if not jobs:
        print("No queued single influencer refresh jobs.")
        return 0

    processed = 0
    seen_account_ids: set[int] = set()
    for job in jobs:
        account_id = job.get("account_id")
        if account_id is not None:
            account_key = int(account_id)
            if account_key in seen_account_ids:
                update_job(
                    int(job["id"]),
                    {
                        "status": "skipped",
                        "error_message": None,
                        "details": {
                            **job_details(job),
                            "retry_count": retry_count(job),
                            "processor": "process_single_refresh_jobs.py",
                            "skip_reason": "duplicate_account_in_same_batch",
                        },
                        "finished_at": utcnow_iso(),
                    },
                )
                print(f"job={job['id']} account_id={account_id} skipped: duplicate queued job in same batch")
                continue
            seen_account_ids.add(account_key)

        process_job(job, include_posts_override=include_posts_override)
        processed += 1
    return processed


def main() -> None:
    parser = argparse.ArgumentParser(description="Process queued single influencer refresh jobs.")
    parser.add_argument("--limit", type=int, default=3, help="Max queued jobs to process in one run")
    parser.add_argument("--watch", action="store_true", help="Keep polling instead of exiting after one run")
    parser.add_argument("--sleep-seconds", type=int, default=300, help="Polling interval for --watch")
    parser.add_argument(
        "--retry-stale-running-minutes",
        type=int,
        default=60,
        help="Requeue running jobs older than this many minutes before processing",
    )
    parser.add_argument("--retry-failed", action="store_true", help="Requeue recent failed jobs before processing")
    parser.add_argument(
        "--max-retries",
        type=int,
        default=3,
        help="Max retry_count allowed when requeueing failed or stale jobs. Use -1 for unlimited.",
    )
    posts_group = parser.add_mutually_exclusive_group()
    posts_group.add_argument("--include-posts", action="store_true", help="Force post refresh for every job")
    posts_group.add_argument("--skip-posts", action="store_true", help="Force profile/metric refresh only")
    args = parser.parse_args()

    include_posts_override: Optional[bool] = None
    if args.include_posts:
        include_posts_override = True
    elif args.skip_posts:
        include_posts_override = False

    while True:
        process_once(
            limit=args.limit,
            include_posts_override=include_posts_override,
            retry_stale_running_minutes=args.retry_stale_running_minutes,
            retry_failed=args.retry_failed,
            max_retries=args.max_retries,
        )
        if not args.watch:
            break
        time.sleep(max(args.sleep_seconds, 1))


if __name__ == "__main__":
    main()
