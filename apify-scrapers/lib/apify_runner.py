import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Mapping, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .logging import log_event

DEFAULT_TIMEOUT_SECONDS = 300
DEFAULT_BACKOFF_FACTOR = 1.0
DEFAULT_RETRY_TOTAL = 3
DEFAULT_RATE_LIMITS_PER_MINUTE = {
    "instagram": 20,
    "tiktok": 20,
    "youtube": 30,
    "x": 20,
}


def _env_truthy(name: str) -> bool:
    value = str(os.getenv(name, "")).strip().lower()
    return value in {"1", "true", "yes", "on"}


def scraper_dry_run_enabled() -> bool:
    return _env_truthy("SCRAPER_DRY_RUN")


def platform_rate_limit_per_minute(platform: Optional[str]) -> int:
    platform_key = str(platform or "").strip().lower()
    env_name = f"{platform_key.upper()}_RATE_LIMIT_PER_MINUTE" if platform_key else ""
    if env_name and os.getenv(env_name):
        try:
            return max(1, int(os.getenv(env_name, "1")))
        except ValueError:
            return DEFAULT_RATE_LIMITS_PER_MINUTE.get(platform_key, 20)
    return DEFAULT_RATE_LIMITS_PER_MINUTE.get(platform_key, 20)


def create_retrying_session(
    *,
    retry_total: int = DEFAULT_RETRY_TOTAL,
    backoff_factor: float = DEFAULT_BACKOFF_FACTOR,
) -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=retry_total,
        connect=retry_total,
        read=retry_total,
        status=retry_total,
        allowed_methods=frozenset({"GET", "POST", "PATCH", "PUT", "DELETE"}),
        status_forcelist=(408, 409, 425, 429, 500, 502, 503, 504),
        backoff_factor=backoff_factor,
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


@dataclass(frozen=True)
class ApifyRunResult:
    data: Any
    provider_run_id: Optional[str]
    duration_seconds: float
    estimated_cost_usd: Optional[float]
    dry_run: bool = False


def throttle_platform(platform: Optional[str]) -> None:
    rate_limit = platform_rate_limit_per_minute(platform)
    delay_seconds = 60.0 / max(rate_limit, 1)
    if delay_seconds > 0:
        time.sleep(delay_seconds)


def run_apify_request(
    *,
    url: str,
    token: str,
    payload: Optional[Dict[str, Any]] = None,
    params: Optional[Mapping[str, str]] = None,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    platform: Optional[str] = None,
    session: Optional[requests.Session] = None,
    expected_type: type = dict,
    actor_id: Optional[str] = None,
) -> ApifyRunResult:
    if scraper_dry_run_enabled():
        log_event(
            "apify.dry_run",
            actor_id=actor_id,
            platform=platform,
            url=url,
            payload_keys=sorted((payload or {}).keys()),
        )
        empty = [] if expected_type is list else {}
        return ApifyRunResult(
            data=empty,
            provider_run_id=None,
            duration_seconds=0.0,
            estimated_cost_usd=None,
            dry_run=True,
        )

    active_session = session or create_retrying_session()
    throttle_platform(platform)
    started_at = time.monotonic()
    response = active_session.post(
        url,
        params={**(dict(params or {})), "token": token},
        json=payload,
        timeout=timeout_seconds,
    )
    duration_seconds = time.monotonic() - started_at
    if not response.ok:
        raise RuntimeError(f"Apify error {response.status_code}: {response.text[:800]}")

    data = response.json()
    if not isinstance(data, expected_type):
        raise RuntimeError(f"Unexpected Apify response: {str(data)[:800]}")

    provider_run_id = None
    estimated_cost_usd = None
    if isinstance(data, dict):
        provider_run_id = str(
            data.get("id")
            or data.get("runId")
            or data.get("data", {}).get("id")
            or ""
        ).strip() or None
        usage = data.get("usage") or data.get("stats") or {}
        if isinstance(usage, dict):
            raw_cost = usage.get("totalUsd") or usage.get("usd") or usage.get("estimatedUsd")
            try:
                estimated_cost_usd = float(raw_cost) if raw_cost is not None else None
            except (TypeError, ValueError):
                estimated_cost_usd = None

    log_event(
        "apify.run",
        actor_id=actor_id,
        platform=platform,
        provider_run_id=provider_run_id,
        duration_seconds=round(duration_seconds, 3),
        estimated_cost_usd=estimated_cost_usd,
    )
    return ApifyRunResult(
        data=data,
        provider_run_id=provider_run_id,
        duration_seconds=duration_seconds,
        estimated_cost_usd=estimated_cost_usd,
    )
