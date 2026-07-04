from typing import Optional

import requests

from .apify_runner import create_retrying_session, scraper_dry_run_enabled
from .logging import log_event
from .supabase_rest import SupabaseRestClient


def download_media_bytes(
    url: str,
    *,
    timeout_seconds: int = 30,
    session: Optional[requests.Session] = None,
    user_agent: Optional[str] = None,
) -> bytes:
    active_session = session or create_retrying_session()
    headers = {"User-Agent": user_agent} if user_agent else None
    response = active_session.get(url, headers=headers, timeout=timeout_seconds)
    if not response.ok:
        raise RuntimeError(f"Media download failed: {response.status_code} {response.text[:400]}")
    return response.content


def upload_storage_bytes(
    client: SupabaseRestClient,
    *,
    bucket: str,
    path: str,
    body: bytes,
    content_type: str,
) -> str:
    if scraper_dry_run_enabled():
        log_event(
            "storage.upload.dry_run",
            bucket=bucket,
            path=path,
            bytes=len(body),
            content_type=content_type,
        )
        return f"{client.base_url}/storage/v1/object/public/{bucket}/{path}"

    client.upload_storage_object(bucket=bucket, path=path, body=body, content_type=content_type)
    return f"{client.base_url}/storage/v1/object/public/{bucket}/{path}"
