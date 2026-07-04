import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def norm_text(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def first_value(item: Dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = item.get(key)
        if value is None:
            continue
        if isinstance(value, str) and value.strip() == "":
            continue
        return value
    return None


def safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or isinstance(value, bool):
            return default
        return int(value)
    except Exception:
        return default


def to_int(value: Any) -> Optional[int]:
    try:
        if value is None:
            return None
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, (int, float)):
            return int(value)
        text = str(value).strip()
        if not text:
            return None
        return int(float(text.replace(",", "")))
    except Exception:
        return None


def iso_from_any_date(value: Any) -> Optional[str]:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    if re.match(r"^\d{4}-\d{2}-\d{2}$", text):
        try:
            return datetime.fromisoformat(text).replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).isoformat()
    except Exception:
        return None


def is_unusable_youtube_avatar(url: Optional[str]) -> bool:
    if not url:
        return True
    text = str(url).strip().lower()
    if not text:
        return True
    if not (text.startswith("http://") or text.startswith("https://")):
        return True
    if "youtube.com/img/favicon" in text:
        return True
    if "/s/desktop/" in text:
        return True
    if "youtube" in text and "favicon" in text:
        return True
    return False


def normalize_profile_image_url(url: Any) -> Optional[str]:
    if url is None:
        return None
    text = str(url).strip()
    if is_unusable_youtube_avatar(text):
        return None
    return text


def split_csv_keywords(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [part for part in re.split(r"\s*,\s*", value) if part]
