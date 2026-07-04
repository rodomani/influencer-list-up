import json
from datetime import datetime, timezone
from typing import Any


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def log_event(event: str, **fields: Any) -> None:
    payload = {
        "timestamp": utcnow_iso(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, ensure_ascii=False, default=str))
