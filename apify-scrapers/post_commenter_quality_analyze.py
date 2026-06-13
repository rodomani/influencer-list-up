#!/usr/bin/env python3
import os
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
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


def safe_int(value: Any) -> Optional[int]:
    try:
        if value is None:
            return None
        if isinstance(value, bool):
            return int(value)
        return int(float(value))
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


SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

SUPPORTED_PLATFORMS = ("instagram", "tiktok", "youtube", "x")
PLATFORMS = tuple(
    token.strip().lower()
    for token in env_str("COMMENTER_QUALITY_PLATFORMS", ",".join(SUPPORTED_PLATFORMS)).split(",")
    if token.strip().lower() in SUPPORTED_PLATFORMS
)

WINDOW_DAYS = env_int("COMMENTER_QUALITY_WINDOW_DAYS", 90)
POST_LIMIT = env_int("COMMENTER_QUALITY_POST_LIMIT", 20)
MAX_ACCOUNTS_PER_RUN = env_int("COMMENTER_QUALITY_MAX_ACCOUNTS_PER_RUN", 500)
MIN_IDENTIFIABLE_COMMENTERS = env_int("COMMENTER_QUALITY_MIN_IDENTIFIABLE_COMMENTERS", 1)
ANALYSIS_VERSION = env_str("COMMENTER_QUALITY_ANALYSIS_VERSION", "v1")

QUESTION_RE = re.compile(r"[?？]|(ですか|ますか|でしょうか|かな\?|what|why|how|which|where|when)\b", re.IGNORECASE)
URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
EMOJI_ONLY_RE = re.compile(r"^[\s\W_]+$", re.UNICODE)
MULTISPACE_RE = re.compile(r"\s+")

JP_GENERIC_LOW_SIGNAL = {
    "すごい", "すご", "やばい", "やば", "最高", "神", "好き", "大好き",
    "可愛い", "かわいい", "かっこいい", "いいね", "いい", "草", "笑", "w", "ww", "www",
    "共感", "共感します", "わかる", "ほんと", "ほんとに", "たしかに",
}
EN_GENERIC_LOW_SIGNAL = {
    "nice", "cool", "great", "amazing", "love it", "first", "lol", "omg", "wow",
}


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

    if table == "posts":
        return {"id", "account_id", "posted_at", "scraped_at"}
    if table == "post_comments_raw":
        return {
            "post_id",
            "platform",
            "comment_id",
            "commenter_id",
            "commenter_username",
            "commenter_display_name",
            "text",
            "like_count",
            "published_at",
            "collected_at",
        }
    if table == "post_commenter_quality_analysis":
        return {
            "post_id",
            "unique_commenters",
            "avg_comments_per_commenter",
            "repeat_commenter_rate",
            "substantive_comment_rate",
            "question_rate",
            "low_signal_comment_rate",
            "suspicious_commenter_rate",
            "analysis_version",
            "updated_at",
            "created_at",
        }
    if table == "analysis_unique_indexes":
        return {"table_name", "tablename", "index_name", "indexname", "indexdef"}
    return set()


POSTS_COLUMNS = supabase_table_columns("posts")
RAW_COLUMNS = supabase_table_columns("post_comments_raw")
QUALITY_COLUMNS = supabase_table_columns("post_commenter_quality_analysis")
INDEX_COLUMNS = supabase_table_columns("analysis_unique_indexes")


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
    validate_required_columns("posts", POSTS_COLUMNS, {"id", "account_id"})
    validate_required_columns(
        "post_comments_raw",
        RAW_COLUMNS,
        {"post_id", "comment_id", "text", "published_at"},
    )
    validate_required_columns(
        "post_commenter_quality_analysis",
        QUALITY_COLUMNS,
        {
            "post_id",
            "unique_commenters",
            "avg_comments_per_commenter",
            "repeat_commenter_rate",
            "substantive_comment_rate",
            "question_rate",
            "low_signal_comment_rate",
            "suspicious_commenter_rate",
            "analysis_version",
            "updated_at",
        },
    )
    validate_unique_index("post_commenter_quality_analysis", ("post_id", "analysis_version"))


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text or "")
    normalized = normalized.replace("\u3000", " ")
    normalized = MULTISPACE_RE.sub(" ", normalized)
    return normalized.strip()


def normalize_for_dedupe(text: str) -> str:
    normalized = normalize_text(text).lower()
    normalized = URL_RE.sub("", normalized)
    return normalized.strip("!?.。、！？」『』（）()[]{}\"' ")


def is_emoji_only(text: str) -> bool:
    normalized = normalize_text(text)
    if not normalized:
        return False
    stripped = re.sub(r"[\s\W_]", "", normalized, flags=re.UNICODE)
    return stripped == ""


def is_low_signal_comment(text: str) -> bool:
    normalized = normalize_text(text)
    if not normalized:
        return True
    if is_emoji_only(normalized):
        return True
    if URL_RE.search(normalized) and len(URL_RE.sub("", normalized).strip()) < 4:
        return True
    compact = normalize_for_dedupe(normalized)
    if len(compact) < 4:
        return True
    if compact in JP_GENERIC_LOW_SIGNAL or compact in EN_GENERIC_LOW_SIGNAL:
        return True
    if re.search(r"(.)\1{5,}", normalized):
        return True
    return False


def is_substantive_comment(text: str) -> bool:
    normalized = normalize_text(text)
    if not normalized or is_low_signal_comment(normalized):
        return False
    visible_length = len(re.sub(r"\s+", "", normalized))
    if visible_length >= 12:
        return True
    if QUESTION_RE.search(normalized) and visible_length >= 6:
        return True
    if "\n" in text and visible_length >= 8:
        return True
    return False


def is_question_comment(text: str) -> bool:
    normalized = normalize_text(text)
    if not normalized:
        return False
    return bool(QUESTION_RE.search(normalized))


def commenter_identity_key(comment: Dict[str, Any]) -> Optional[str]:
    for field in ("commenter_id", "commenter_username", "commenter_display_name"):
        value = comment.get(field)
        if value is None:
            continue
        text = normalize_text(str(value))
        if text:
            return f"{field}:{text.lower()}"
    return None


def mean(values: Sequence[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def get_account_rows(limit: int = MAX_ACCOUNTS_PER_RUN, platform: Optional[str] = None) -> List[Dict[str, Any]]:
    params = {
        "select": "id,platform",
        "order": "id.asc",
        "limit": str(limit),
    }
    if platform:
        params["platform"] = f"eq.{platform}"
    elif PLATFORMS:
        params["platform"] = f"in.({','.join(PLATFORMS)})"
    return sb_get("sns_accounts", params, range_from=0, range_to=max(limit - 1, 0))


def get_posts_for_account(account_id: int, limit: int = POST_LIMIT) -> List[Dict[str, Any]]:
    select_fields = [field for field in ("id", "account_id", "posted_at", "scraped_at") if field in POSTS_COLUMNS]
    rows = sb_get(
        "posts",
        {
            "select": ",".join(select_fields),
            "account_id": f"eq.{account_id}",
            "order": "posted_at.desc,id.desc" if "posted_at" in POSTS_COLUMNS else "id.desc",
        },
        range_from=0,
        range_to=max(limit * 5 - 1, 0),
    )

    if WINDOW_DAYS > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
        filtered: List[Dict[str, Any]] = []
        for row in rows:
            when = parse_datetime(row.get("posted_at")) or parse_datetime(row.get("scraped_at"))
            if when and when < cutoff:
                continue
            filtered.append(row)
        rows = filtered

    return rows[:limit]


def get_raw_comments_for_posts(post_ids: List[int]) -> Dict[int, List[Dict[str, Any]]]:
    if not post_ids:
        return {}

    select_fields = [field for field in (
        "post_id",
        "platform",
        "comment_id",
        "commenter_id",
        "commenter_username",
        "commenter_display_name",

        "text",
        "like_count",
        "published_at",
    ) if field in RAW_COLUMNS]

    rows: List[Dict[str, Any]] = []
    for batch in chunked(post_ids, 100):
        rows.extend(
            sb_get(
                "post_comments_raw",
                {
                    "select": ",".join(select_fields),
                    "post_id": f"in.({','.join(str(post_id) for post_id in batch)})",
                    "order": "published_at.asc,comment_id.asc" if "published_at" in RAW_COLUMNS else "comment_id.asc",
                },
                range_from=0,
                range_to=5000,
            )
        )

    by_post: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for row in rows:
        post_id = safe_int(row.get("post_id"))
        if post_id is None:
            continue
        by_post[post_id].append(row)
    return by_post


def analyze_comments_for_post(post_id: int, comments: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_comments = len(comments)
    low_signal_count = 0
    substantive_count = 0
    question_count = 0

    commenters: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    normalized_text_counter: Counter[str] = Counter()

    for comment in comments:
        text = comment.get("text") or ""
        normalized_text = normalize_for_dedupe(text)
        if normalized_text:
            normalized_text_counter[normalized_text] += 1

        if is_low_signal_comment(text):
            low_signal_count += 1
        if is_substantive_comment(text):
            substantive_count += 1
        if is_question_comment(text):
            question_count += 1

        commenter_key = commenter_identity_key(comment)
        if commenter_key:
            commenters[commenter_key].append(comment)

    unique_commenters = len(commenters)
    identifiable_comments = sum(len(group) for group in commenters.values())
    avg_comments_per_commenter = (
        identifiable_comments / unique_commenters
        if unique_commenters > 0
        else 0.0
    )

    repeat_commenters = sum(1 for group in commenters.values() if len(group) >= 2)
    repeat_commenter_rate = (
        repeat_commenters / unique_commenters
        if unique_commenters > 0
        else 0.0
    )

    suspicious_commenters = 0
    for group in commenters.values():
        texts = [normalize_for_dedupe(comment.get("text") or "") for comment in group]
        texts = [text for text in texts if text]
        duplicate_rate = 0.0
        if texts:
            duplicate_rate = 1.0 - (len(set(texts)) / len(texts))

        low_signal_ratio = mean([1.0 if is_low_signal_comment(comment.get("text") or "") else 0.0 for comment in group])
        short_generic_ratio = mean([1.0 if len(normalize_for_dedupe(comment.get("text") or "")) < 6 else 0.0 for comment in group])

        if (len(group) >= 2 and duplicate_rate >= 0.5) or (len(group) >= 2 and low_signal_ratio >= 0.8) or (len(group) >= 3 and short_generic_ratio >= 0.8):
            suspicious_commenters += 1

    suspicious_commenter_rate = (
        suspicious_commenters / unique_commenters
        if unique_commenters >= MIN_IDENTIFIABLE_COMMENTERS and unique_commenters > 0
        else 0.0
    )

    payload = {
        "post_id": post_id,
        "unique_commenters": unique_commenters,
        "avg_comments_per_commenter": avg_comments_per_commenter,
        "repeat_commenter_rate": repeat_commenter_rate,
        "substantive_comment_rate": substantive_count / total_comments if total_comments > 0 else 0.0,
        "question_rate": question_count / total_comments if total_comments > 0 else 0.0,
        "low_signal_comment_rate": low_signal_count / total_comments if total_comments > 0 else 0.0,
        "suspicious_commenter_rate": suspicious_commenter_rate,
        "analysis_version": ANALYSIS_VERSION,
        "updated_at": utcnow_iso(),
    }
    return {key: value for key, value in payload.items() if key in QUALITY_COLUMNS}


def analyze_posts_for_account(account_id: int, platform: Optional[str] = None, limit: int = POST_LIMIT) -> Dict[str, Any]:
    posts = get_posts_for_account(account_id, limit=limit)
    if not posts:
        return {
            "account_id": account_id,
            "platform": platform,
            "posts_seen": 0,
            "posts_analyzed": 0,
        }

    post_ids = [int(post["id"]) for post in posts if post.get("id") is not None]
    raw_comments_by_post = get_raw_comments_for_posts(post_ids)

    payloads: List[Dict[str, Any]] = []
    for post_id in post_ids:
        comments = raw_comments_by_post.get(post_id) or []
        if not comments:
            continue
        payloads.append(analyze_comments_for_post(post_id, comments))

    upserted = sb_upsert("post_commenter_quality_analysis", payloads, on_conflict="post_id,analysis_version") if payloads else []
    return {
        "account_id": account_id,
        "platform": platform,
        "posts_seen": len(post_ids),
        "posts_analyzed": len(upserted) or len(payloads),
    }


def main() -> None:
    validate_runtime_schema()
    explicit_post_id = safe_int(os.getenv("COMMENTER_QUALITY_POST_ID"))
    explicit_account_id = safe_int(os.getenv("COMMENTER_QUALITY_ACCOUNT_ID"))
    platform_filter = env_str("COMMENTER_QUALITY_PLATFORM", "").lower() or None

    if explicit_post_id is not None:
        raw_by_post = get_raw_comments_for_posts([explicit_post_id])
        comments = raw_by_post.get(explicit_post_id) or []
        if not comments:
            print(f"[SKIP] post_id={explicit_post_id} no raw comments found")
            return
        payload = analyze_comments_for_post(explicit_post_id, comments)
        sb_upsert("post_commenter_quality_analysis", [payload], on_conflict="post_id,analysis_version")
        print(
            f"[OK] post_id={explicit_post_id} unique_commenters={payload.get('unique_commenters')} "
            f"repeat_rate={float(payload.get('repeat_commenter_rate') or 0.0):.3f}"
        )
        return

    if explicit_account_id is not None:
        result = analyze_posts_for_account(explicit_account_id, platform=platform_filter, limit=POST_LIMIT)
        print(
            f"[OK] account_id={explicit_account_id} platform={platform_filter or 'all'} "
            f"posts_seen={result['posts_seen']} posts_analyzed={result['posts_analyzed']}"
        )
        return

    accounts = get_account_rows(limit=MAX_ACCOUNTS_PER_RUN, platform=platform_filter)
    if not accounts:
        print("No accounts found for commenter quality analysis.")
        return

    for row in accounts:
        account_id = int(row["id"])
        platform = str(row.get("platform") or "").strip().lower() or None
        result = analyze_posts_for_account(account_id, platform=platform, limit=POST_LIMIT)
        print(
            f"[OK] platform={platform} account_id={account_id} "
            f"posts_seen={result['posts_seen']} posts_analyzed={result['posts_analyzed']}"
        )


if __name__ == "__main__":
    main()
