from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import requests

from .apify_runner import create_retrying_session, scraper_dry_run_enabled
from .logging import log_event


@dataclass(frozen=True)
class SupabaseRestClient:
    base_url: str
    service_role_key: str
    timeout_seconds: int = 60
    session: requests.Session = field(default_factory=create_retrying_session)

    def headers(self, prefer: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def storage_headers(self, content_type: str, upsert: bool = True) -> Dict[str, str]:
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": content_type,
        }
        if upsert:
            headers["x-upsert"] = "true"
        return headers

    def get(
        self,
        table: str,
        params: Dict[str, str],
        *,
        range_from: Optional[int] = None,
        range_to: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rest/v1/{table}"
        headers = self.headers()
        if range_from is not None and range_to is not None:
            headers["Range"] = f"{range_from}-{range_to}"
        response = self.session.get(url, headers=headers, params=params, timeout=self.timeout_seconds)
        if not response.ok:
            raise RuntimeError(f"GET {table} failed: {response.status_code} {response.text[:800]}")
        data = response.json()
        return data if isinstance(data, list) else []

    def patch(self, table: str, params: Dict[str, str], payload: Dict[str, Any]) -> None:
        if not payload:
            return
        if scraper_dry_run_enabled():
            log_event("supabase.patch.dry_run", table=table, keys=sorted(payload.keys()))
            return
        url = f"{self.base_url}/rest/v1/{table}"
        response = self.session.patch(
            url,
            headers=self.headers(),
            params=params,
            json=payload,
            timeout=self.timeout_seconds,
        )
        if not response.ok:
            raise RuntimeError(f"PATCH {table} failed: {response.status_code} {response.text[:800]}")

    def upsert(
        self,
        table: str,
        rows: List[Dict[str, Any]],
        *,
        on_conflict: Optional[str] = None,
        returning: bool = False,
    ) -> List[Dict[str, Any]]:
        if not rows:
            return []
        if scraper_dry_run_enabled():
            log_event("supabase.upsert.dry_run", table=table, rows=len(rows), on_conflict=on_conflict)
            return rows if returning else []
        url = f"{self.base_url}/rest/v1/{table}"
        headers = self.headers(
            "resolution=merge-duplicates,return=representation"
            if returning
            else "resolution=merge-duplicates"
        )
        params: Dict[str, str] = {}
        if on_conflict:
            params["on_conflict"] = on_conflict
        response = self.session.post(
            url,
            headers=headers,
            params=params,
            json=rows,
            timeout=self.timeout_seconds,
        )
        if not response.ok:
            raise RuntimeError(f"UPSERT {table} failed: {response.status_code} {response.text[:800]}")
        if not returning:
            return []
        data = response.json()
        return data if isinstance(data, list) else []

    def rpc(self, function_name: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}/rest/v1/rpc/{function_name}"
        if scraper_dry_run_enabled():
            log_event("supabase.rpc.dry_run", function_name=function_name)
            return None
        response = self.session.post(
            url,
            headers=self.headers("return=representation"),
            json=payload or {},
            timeout=self.timeout_seconds,
        )
        if not response.ok:
            raise RuntimeError(f"RPC {function_name} failed: {response.status_code} {response.text[:800]}")
        if not response.content:
            return None
        return response.json()

    def upload_storage_object(
        self,
        *,
        bucket: str,
        path: str,
        body: bytes,
        content_type: str,
        upsert: bool = True,
    ) -> None:
        if scraper_dry_run_enabled():
            log_event("supabase.storage_upload.dry_run", bucket=bucket, path=path, bytes=len(body))
            return
        url = f"{self.base_url}/storage/v1/object/{bucket}/{path.lstrip('/')}"
        response = self.session.post(
            url,
            headers=self.storage_headers(content_type, upsert=upsert),
            data=body,
            timeout=self.timeout_seconds,
        )
        if not response.ok:
            raise RuntimeError(
                f"STORAGE UPLOAD {bucket}/{path} failed: {response.status_code} {response.text[:800]}"
            )


def create_supabase_rest(base_url: str, service_role_key: str) -> SupabaseRestClient:
    return SupabaseRestClient(base_url=base_url.rstrip("/"), service_role_key=service_role_key)
