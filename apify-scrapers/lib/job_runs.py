from typing import Any, Dict, Optional, Set

from .env import utcnow_iso
from .supabase_rest import SupabaseRestClient


def table_columns(
    supabase: SupabaseRestClient,
    table: str,
    fallback: Optional[Set[str]] = None,
) -> Set[str]:
    if fallback:
        return set(fallback)
    try:
        rows = supabase.get(table, {"select": "*", "limit": "1"})
        if rows:
            return set(rows[0].keys())
    except Exception:
        pass
    return fallback or set()


def filter_columns(available_columns: Set[str], row: Dict[str, Any]) -> Dict[str, Any]:
    if not available_columns:
        return row
    return {key: value for key, value in row.items() if key in available_columns}


def record_job_run(
    supabase: SupabaseRestClient,
    available_columns: Set[str],
    *,
    analysis_name: str,
    account_id: int,
    platform: str,
    status: str,
    rows_written: Optional[int] = None,
    error_message: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    analysis_version: str = "v1",
    started_at: Optional[str] = None,
    on_conflict: Optional[str] = None,
) -> None:
    if not available_columns:
        return
    terminal_statuses = {"completed", "failed", "skipped", "success", "partial"}
    row = filter_columns(
        available_columns,
        {
            "analysis_name": analysis_name,
            "account_id": account_id,
            "platform": platform,
            "status": status,
            "rows_written": rows_written,
            "error_message": error_message[:1000] if error_message else None,
            "details": details or {},
            "analysis_version": analysis_version,
            "started_at": started_at or utcnow_iso(),
            "finished_at": utcnow_iso() if status in terminal_statuses else None,
        },
    )
    try:
        supabase.upsert("analysis_job_runs", [row], on_conflict=on_conflict, returning=False)
    except Exception:
        return
