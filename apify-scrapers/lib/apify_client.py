from typing import Any, Dict, List, Optional

from .apify_runner import create_retrying_session, run_apify_request

SESSION = create_retrying_session()


def run_actor_sync_dataset_items(
    actor_id: str,
    token: str,
    payload: Dict[str, Any],
    *,
    timeout_seconds: int = 300,
    base_url: str = "https://api.apify.com/v2/acts",
    platform: Optional[str] = None,
) -> List[Dict[str, Any]]:
    url = f"{base_url}/{actor_id}/run-sync-get-dataset-items"
    result = run_apify_request(
        url=url,
        token=token,
        payload=payload,
        timeout_seconds=timeout_seconds,
        platform=platform,
        session=SESSION,
        expected_type=list,
        actor_id=actor_id,
    )
    return result.data


def call_apify_api(
    path: str,
    token: str,
    *,
    method: str = "GET",
    params: Optional[Dict[str, str]] = None,
    json_payload: Optional[Dict[str, Any]] = None,
    timeout_seconds: int = 300,
    base_url: str = "https://api.apify.com/v2",
    platform: Optional[str] = None,
) -> Dict[str, Any]:
    response = SESSION.request(
        method,
        f"{base_url.rstrip('/')}/{path.lstrip('/')}",
        params={**(params or {}), "token": token},
        json=json_payload,
        timeout=timeout_seconds,
    )
    if not response.ok:
        raise RuntimeError(f"Apify API error {response.status_code}: {response.text[:800]}")
    data = response.json()
    return data if isinstance(data, dict) else {"data": data}
