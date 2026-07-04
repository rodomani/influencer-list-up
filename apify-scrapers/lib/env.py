import json
import os
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional


def must_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Missing env var: {key}")
    return value.strip()


def env_str(key: str, default: str) -> str:
    value = os.getenv(key)
    return value.strip() if value and value.strip() else default


def env_int(key: str, default: int) -> int:
    value = os.getenv(key)
    return int(value) if value and value.strip() else default


def env_float(key: str, default: float) -> float:
    value = os.getenv(key)
    return float(value) if value and value.strip() else default


def env_bool(key: str, default: bool) -> bool:
    value = os.getenv(key)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "y", "on")


def env_json(key: str, default: Dict[str, Any]) -> Dict[str, Any]:
    raw = os.getenv(key)
    if not raw or not raw.strip():
        return default
    try:
        return json.loads(raw)
    except Exception as exc:
        raise RuntimeError(f"Invalid JSON in env var {key}: {exc}") from exc


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


def today_iso() -> str:
    return date.today().isoformat()


def iso_to_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None
