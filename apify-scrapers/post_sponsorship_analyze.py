#!/usr/bin/env python3
import os
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set

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


def uniq_keep_order(values: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    ordered: List[str] = []
    for value in values:
        normalized = value.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)
    return ordered


SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

SUPPORTED_PLATFORMS = ("instagram", "tiktok", "youtube", "x")
PLATFORMS = tuple(
    token.strip().lower()
    for token in env_str("SPONSORSHIP_PLATFORMS", ",".join(SUPPORTED_PLATFORMS)).split(",")
    if token.strip().lower() in SUPPORTED_PLATFORMS
)

WINDOW_DAYS = env_int("SPONSORSHIP_WINDOW_DAYS", 90)
POST_LIMIT = env_int("SPONSORSHIP_POST_LIMIT", 20)
MAX_ACCOUNTS_PER_RUN = env_int("SPONSORSHIP_MAX_ACCOUNTS_PER_RUN", 500)
ANALYSIS_VERSION = env_str("SPONSORSHIP_ANALYSIS_VERSION", "v1")
SPONSORED_THRESHOLD = float(env_str("SPONSORSHIP_THRESHOLD", "0.60"))

DISCLOSURE_STRONG_TERMS = (
    "#ad",
    "#sponsored",
    "#advertisement",
    "paid partnership",
    "paid collaboration",
    "sponsored post",
    "sponsored by",
    "advertisement",
    "promotion",
    "スポンサード",
    "タイアップ",
    "有償案件",
    "企業案件",
    "商品提供",
    "ブランド提供",
    "プロモーション",
    "広告",
    "広告投稿",
)

DISCLOSURE_MEDIUM_TERMS = (
    "#pr",
    " pr ",
    "提供",
    "協賛",
    "案件",
    "gifted",
    "gifting",
    "affiliate",
    "gifting",
    "アフィリエイト",
    "ギフティング",
    "pr案件",
    "タイアップ投稿",
)

AFFILIATE_TERMS = (
    "affiliate link",
    "affiliate code",
    "discount code",
    "promo code",
    "coupon code",
    "use my code",
    "use code",
    "shop my link",
    "commission",
    "クーポンコード",
    "割引コード",
    "紹介コード",
    "プロモコード",
    "アフィリエイトリンク",
    "このリンクから",
    "コードを使って",
)

CTA_TERMS = (
    "buy now",
    "shop now",
    "order now",
    "check it out",
    "check this out",
    "available now",
    "link in bio",
    "tap the link",
    "get yours",
    "purchase here",
    "今すぐ購入",
    "購入はこちら",
    "こちらから購入",
    "今すぐチェック",
    "ぜひチェックしてみてください",
    "チェックしてみて",
    "プロフィールのリンクから",
    "リンクはプロフィールへ",
    "詳細はこちら",
    "ぜひ試してみて",
    "こちらから注文",
    "発売中",
    "販売中",
)

PROMO_TERMS = (
    "must-have",
    "highly recommend",
    "limited time",
    "exclusive",
    "new launch",
    "new drop",
    "favorite product",
    "favorite item",
    "おすすめ",
    "超おすすめ",
    "イチオシ",
    "必見",
    "必須",
    "限定",
    "期間限定",
    "新発売",
    "新登場",
    "話題の",
    "注目の",
    "大人気",
    "人気商品",
    "ぜひ使ってほしい",
    "おすすめしたい",
)

GENERIC_BRAND_TOKENS = {
    "ad",
    "sponsored",
    "advertisement",
    "promotion",
    "promo",
    "pr",
    "gifted",
    "affiliate",
    "sale",
    "shop",
    "buy",
    "おすすめ",
    "広告",
    "提供",
    "案件",
    "タイアップ",
    "協賛",
    "スポンサード",
    "限定",
}

MENTION_RE = re.compile(r"(?<![A-Za-z0-9_])@([A-Za-z0-9_.]{2,40})")
HASHTAG_RE = re.compile(r"#([0-9A-Za-z_\u3040-\u30ff\u3400-\u9fffー]{2,60})")
URL_RE = re.compile(r"https?://[^\s)]+", re.IGNORECASE)
COUPON_CODE_RE = re.compile(r"(?:use\s+(?:my\s+)?code|code[:：]|クーポンコード|割引コード|紹介コード|プロモコード)\s*[:：]?\s*([A-Z0-9_-]{3,20})", re.IGNORECASE)
PR_BOUNDARY_RE = re.compile(r"(?<![A-Za-z0-9])#?pr(?![A-Za-z0-9])", re.IGNORECASE)


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


def supabase_table_columns(table: str) -> Set[str]:
    try:
        rows = sb_get(table, {"select": "*", "limit": "1"})
        if rows:
            return set(rows[0].keys())
    except Exception:
        pass

    if table == "posts":
        return {
            "id",
            "account_id",
            "content_text",
            "caption",
            "link",
            "posted_at",
            "scraped_at",
        }
    if table == "post_sponsorship_analysis":
        return {
            "post_id",
            "is_sponsored",
            "sponsorship_confidence",
            "sponsorship_type",
            "brand_mentions",
            "cta_signals",
            "signal_reasons",
            "analysis_version",
            "updated_at",
            "created_at",
        }
    return set()


POSTS_COLUMNS = supabase_table_columns("posts")
SPONSORSHIP_COLUMNS = supabase_table_columns("post_sponsorship_analysis")


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text or "")
    normalized = normalized.replace("\u3000", " ")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def normalized_lower(text: str) -> str:
    return normalize_text(text).lower()


def find_phrase_matches(text_lower: str, terms: Sequence[str]) -> List[str]:
    matches: List[str] = []
    for term in terms:
        normalized = normalized_lower(term)
        if normalized and normalized in text_lower:
            matches.append(term)
    return uniq_keep_order(matches)


def build_combined_text(row: Dict[str, Any]) -> str:
    candidates: List[str] = []
    for key in ("content_text", "caption", "title", "description"):
        if key in POSTS_COLUMNS:
            value = normalize_text(str(row.get(key) or ""))
            if value:
                candidates.append(value)
    return "\n".join(uniq_keep_order(candidates))


def extract_brand_mentions(text: str) -> List[str]:
    mentions = [match.group(1).strip() for match in MENTION_RE.finditer(text)]
    hashtags = [match.group(1).strip() for match in HASHTAG_RE.finditer(text)]

    candidates: List[str] = []
    for token in mentions + hashtags:
        normalized = normalize_text(token)
        normalized_lower_token = normalized.lower()
        if len(normalized) < 2:
            continue
        if normalized_lower_token in GENERIC_BRAND_TOKENS:
            continue
        candidates.append(normalized)
    return uniq_keep_order(candidates)[:10]


def score_components(
    text: str,
    strong_disclosure: List[str],
    medium_disclosure: List[str],
    affiliate_terms: List[str],
    cta_terms: List[str],
    promo_terms: List[str],
    brand_mentions: List[str],
) -> Dict[str, float]:
    score_breakdown = {
        "strong_disclosure": min(0.85, 0.70 + 0.05 * max(len(strong_disclosure) - 1, 0)) if strong_disclosure else 0.0,
        "medium_disclosure": min(0.45, 0.28 + 0.08 * max(len(medium_disclosure) - 1, 0)) if medium_disclosure else 0.0,
        "affiliate": min(0.55, 0.35 + 0.08 * max(len(affiliate_terms) - 1, 0)) if affiliate_terms else 0.0,
        "cta": min(0.25, 0.08 * len(cta_terms)) if cta_terms else 0.0,
        "promo": min(0.15, 0.04 * len(promo_terms)) if promo_terms else 0.0,
        "brand_support": 0.12 if brand_mentions and (strong_disclosure or medium_disclosure or affiliate_terms or cta_terms or promo_terms) else 0.0,
    }

    if COUPON_CODE_RE.search(text):
        score_breakdown["coupon_code_pattern"] = 0.20
    else:
        score_breakdown["coupon_code_pattern"] = 0.0

    total = sum(score_breakdown.values())
    score_breakdown["total"] = clamp(total, 0.0, 1.0)
    return score_breakdown


def sponsorship_type_from_signals(
    confidence: float,
    strong_disclosure: List[str],
    affiliate_terms: List[str],
    brand_mentions: List[str],
) -> str:
    if strong_disclosure:
        return "disclosed_ad"
    if affiliate_terms:
        return "affiliate_or_coupon"
    if confidence >= SPONSORED_THRESHOLD and brand_mentions:
        return "brand_promo"
    if confidence >= SPONSORED_THRESHOLD:
        return "possible_sponsorship"
    return "organic"


def analyze_post_row(row: Dict[str, Any]) -> Dict[str, Any]:
    post_id = safe_int(row.get("id"))
    if post_id is None:
        raise RuntimeError(f"Post row is missing id: {row}")

    combined_text = build_combined_text(row)
    normalized = normalized_lower(combined_text)
    brand_mentions = extract_brand_mentions(combined_text)

    strong_disclosure = find_phrase_matches(normalized, DISCLOSURE_STRONG_TERMS)
    medium_disclosure = find_phrase_matches(normalized, DISCLOSURE_MEDIUM_TERMS)
    affiliate_terms = find_phrase_matches(normalized, AFFILIATE_TERMS)
    cta_terms = find_phrase_matches(normalized, CTA_TERMS)
    promo_terms = find_phrase_matches(normalized, PROMO_TERMS)

    if PR_BOUNDARY_RE.search(normalized):
        medium_disclosure = uniq_keep_order([*medium_disclosure, "PR"])

    coupon_codes = [match.group(1) for match in COUPON_CODE_RE.finditer(normalized) if match.group(1)]
    if coupon_codes:
        affiliate_terms = uniq_keep_order([*affiliate_terms, *[f"code:{code.upper()}" for code in coupon_codes]])

    score_breakdown = score_components(
        normalized,
        strong_disclosure,
        medium_disclosure,
        affiliate_terms,
        cta_terms,
        promo_terms,
        brand_mentions,
    )
    confidence = score_breakdown.pop("total")
    is_sponsored = confidence >= SPONSORED_THRESHOLD or bool(strong_disclosure)
    sponsorship_type = sponsorship_type_from_signals(confidence, strong_disclosure, affiliate_terms, brand_mentions)

    signal_reasons = {
        "strong_disclosure": strong_disclosure,
        "medium_disclosure": medium_disclosure,
        "affiliate_terms": affiliate_terms,
        "cta_terms": cta_terms,
        "promo_terms": promo_terms,
        "brand_mentions": brand_mentions,
        "score_components": score_breakdown,
        "matched_url_count": len(URL_RE.findall(combined_text)),
        "has_text": bool(combined_text),
    }

    payload = {
        "post_id": post_id,
        "is_sponsored": is_sponsored,
        "sponsorship_confidence": confidence,
        "sponsorship_type": sponsorship_type,
        "brand_mentions": brand_mentions,
        "cta_signals": cta_terms,
        "signal_reasons": signal_reasons,
        "analysis_version": ANALYSIS_VERSION,
        "updated_at": utcnow_iso(),
    }
    return {key: value for key, value in payload.items() if key in SPONSORSHIP_COLUMNS}


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


def get_recent_posts_for_account(account_id: int, limit: int = POST_LIMIT) -> List[Dict[str, Any]]:
    select_fields = [field for field in ("id", "account_id", "content_text", "caption", "title", "description", "link", "posted_at", "scraped_at") if field in POSTS_COLUMNS]
    if "id" not in select_fields:
        raise RuntimeError("posts table must contain id for sponsorship analysis")

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
            posted_at = parse_datetime(row.get("posted_at")) or parse_datetime(row.get("scraped_at"))
            if posted_at and posted_at < cutoff:
                continue
            filtered.append(row)
        rows = filtered

    return rows[:limit]


def analyze_recent_posts_for_account(account_id: int, platform: Optional[str] = None, limit: int = POST_LIMIT) -> Dict[str, Any]:
    posts = get_recent_posts_for_account(account_id, limit=limit)
    if not posts:
        return {
            "account_id": account_id,
            "platform": platform,
            "posts_analyzed": 0,
            "sponsored_posts": 0,
            "upserted_rows": 0,
        }

    payloads = [analyze_post_row(post) for post in posts]
    upserted = sb_upsert("post_sponsorship_analysis", payloads, on_conflict="post_id,analysis_version")

    sponsored_posts = sum(1 for payload in payloads if payload.get("is_sponsored"))
    return {
        "account_id": account_id,
        "platform": platform,
        "posts_analyzed": len(posts),
        "sponsored_posts": sponsored_posts,
        "upserted_rows": len(upserted) or len(payloads),
    }


def main() -> None:
    explicit_account_id = safe_int(os.getenv("SPONSORSHIP_ACCOUNT_ID"))
    platform_filter = env_str("SPONSORSHIP_PLATFORM", "").lower() or None

    if explicit_account_id is not None:
        summary = analyze_recent_posts_for_account(explicit_account_id, platform=platform_filter, limit=POST_LIMIT)
        print(
            f"[OK] account_id={explicit_account_id} platform={platform_filter or 'all'} "
            f"posts_analyzed={summary['posts_analyzed']} sponsored_posts={summary['sponsored_posts']}"
        )
        return

    accounts = get_account_rows(limit=MAX_ACCOUNTS_PER_RUN, platform=platform_filter)
    if not accounts:
        print("No accounts found for post sponsorship analysis.")
        return

    for row in accounts:
        account_id = int(row["id"])
        platform = str(row.get("platform") or "").strip().lower() or None
        summary = analyze_recent_posts_for_account(account_id, platform=platform, limit=POST_LIMIT)
        print(
            f"[OK] platform={platform} account_id={account_id} "
            f"posts_analyzed={summary['posts_analyzed']} sponsored_posts={summary['sponsored_posts']}"
        )


if __name__ == "__main__":
    main()
