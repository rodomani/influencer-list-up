import os
import re
import json
import random
import time
import requests
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple, Set

from dotenv import load_dotenv

load_dotenv()

# -----------------------
# Utilities
# -----------------------
def must_env(k: str) -> str:
    v = os.getenv(k)
    if not v:
        raise RuntimeError(f"Missing env var: {k}")
    return v.strip()

def env_int(k: str, default: int) -> int:
    v = os.getenv(k)
    return int(v) if v and v.strip() else default

def env_float(k: str, default: float) -> float:
    v = os.getenv(k)
    return float(v) if v and v.strip() else default

def env_bool(k: str, default: bool) -> bool:
    v = os.getenv(k)
    if v is None:
        return default
    v = v.strip().lower()
    return v in ("1", "true", "yes", "y", "on")

def env_str(k: str, default: str) -> str:
    v = os.getenv(k)
    return v.strip() if v and v.strip() else default

def env_json(k: str, default: Dict[str, Any]) -> Dict[str, Any]:
    raw = os.getenv(k)
    if not raw or not raw.strip():
        return default
    try:
        return json.loads(raw)
    except Exception as exc:
        raise RuntimeError(f"Invalid JSON in env var {k}: {exc}")

def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def today_iso() -> str:
    return date.today().isoformat()

def iso_to_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None

def norm_text(s: Optional[str]) -> str:
    return (s or "").strip().lower()

def first(it: Dict[str, Any], *keys: str) -> Any:
    for k in keys:
        v = it.get(k)
        if v is None:
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        return v
    return None

def to_int(v: Any) -> Optional[int]:
    try:
        if v is None:
            return None
        if isinstance(v, bool):
            return int(v)
        if isinstance(v, (int, float)):
            return int(v)
        s = str(v).strip()
        if not s:
            return None
        s = s.replace(",", "")
        return int(float(s))
    except Exception:
        return None

# -----------------------
# Config
# -----------------------
MODE = env_str("MODE", "discovery").lower()  # discovery | monitoring

APIFY_TOKEN = must_env("APIFY_TOKEN")

APIFY_TIKTOK_SEARCH_ACTOR = env_str("APIFY_TIKTOK_SEARCH_ACTOR", "clockworks~tiktok-scraper")
APIFY_TIKTOK_PROFILE_ACTOR = env_str("APIFY_TIKTOK_PROFILE_ACTOR", "clockworks~tiktok-scraper")

SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")
PROFILE_IMAGE_BUCKET = env_str("PROFILE_IMAGE_BUCKET", "profile_images") or "profile_images"

DEFAULT_PROFILE_IMAGE_URL = env_str("DEFAULT_PROFILE_IMAGE_URL", "https://www.tiktok.com/favicon.ico")

TIKTOK_KEYWORD_POOL = [
  'コスメ',
'メイク',
'スキンケア',
'グルメ',
'カフェ',
'コンビニ',
'ファッション',
'コーデ',
'ルーティン',
'ダイエット',
'筋トレ',
'ヘアアレンジ',
'ネイル',
'推し活',
'開封',
'レビュー',
'旅行',
'Vlog',
'収納',
'美容'
]
TIKTOK_KEYWORDS_PER_RUN = env_int("TIKTOK_KEYWORDS_PER_RUN", 15)  
TIKTOK_MAX_ITEMS = env_int("TIKTOK_MAX_ITEMS", 60)           

TIKTOK_LANGUAGE = env_str("TIKTOK_LANGUAGE", "ja")
TIKTOK_PROXY_COUNTRY = env_str("TIKTOK_PROXY_COUNTRY", "JP")

CYCLE_STATE_PATH = os.path.join(os.path.dirname(__file__), ".keyword_cycle_tiktok.json")

# Influencer filter gates
MIN_FOLLOWERS = env_int("MIN_FOLLOWERS", 10_000)
JP_STRICT = env_bool("JP_STRICT", True)
INFLUENCER_STRICT = env_bool("INFLUENCER_STRICT", False)

# Trending thresholds (DB-only)
HIGH_FOLLOWERS_THRESHOLD = env_int("HIGH_FOLLOWERS_THRESHOLD", 100_000)
MIN_DAILY_GROWTH_PCT = env_float("MIN_DAILY_GROWTH_PCT", 0.5)
MIN_DAILY_GROWTH_ABS = env_int("MIN_DAILY_GROWTH_ABS", 500)
TREND_DAYS = env_int("TREND_DAYS", 3)

# Monitoring knobs (posts)
TIKTOK_MAX_INFLUENCERS_PER_RUN = env_int("TIKTOK_MAX_INFLUENCERS_PER_RUN", 40)
TIKTOK_POSTS_PER_INFLUENCER = env_int("TIKTOK_POSTS_PER_INFLUENCER", 12)
TIKTOK_POSTS_REFRESH_HOURS = env_int("TIKTOK_POSTS_REFRESH_HOURS", 6)

# Discovery knobs (DB gating)
# If you don't have these columns/behaviors, keep them conservative.
DISCOVERY_STALE_DAYS = env_int("DISCOVERY_STALE_DAYS", 14)
MAX_DB_CANDIDATES_FETCH = env_int("MAX_DB_CANDIDATES_FETCH", 300)
MIN_DB_CANDIDATES_PER_KEYWORD = env_int("MIN_DB_CANDIDATES_PER_KEYWORD", 80)

# Example SEARCH template is already aligned with your current code.
APIFY_TIKTOK_SEARCH_PAYLOAD_TEMPLATE = env_json(
    "APIFY_TIKTOK_SEARCH_PAYLOAD_TEMPLATE",
    {
        "searchQueries": ["{keyword}"],
        "searchSection": "/video",
        "resultsPerPage": "{maxItems}",
        "proxyCountry": "{proxyCountry}",
    },
)

APIFY_TIKTOK_PROFILE_PAYLOAD_TEMPLATE = env_json(
    "APIFY_TIKTOK_PROFILE_PAYLOAD_TEMPLATE",
    {
        # Replace these keys with what your actor expects:
        "usernames": ["{username}"],
        "resultsPerPage": "{maxItems}",
        "proxyCountry": "{proxyCountry}",
    },
)

# -----------------------
# Influencer heuristics
# -----------------------
COMPANY_BIO_KEYWORDS = {
    "official", "brand", "shop", "store", "customer service", "support", "press",
    "pr", "sales", "shipping", "worldwide shipping", "order", "orders", "buy",
    "discount", "promo", "promotion", "wholesale", "stockist",
    "headquarters", "hq", "contact us", "email us", "business inquiries",
    "corp", "corporation", "company", "inc", "ltd", "llc", "co.", "gmbh", "plc", "news", "staff"
}

COMPANY_NAME_TOKENS = {
    "inc", "ltd", "llc", "corp", "co", "company", "group", "official", "shop", "store",
    "studio", "agency", "brand", "boutique", "restaurant", "hotel", "clinic", "news", "staff"
}

PERSON_HINT_KEYWORDS = {
    "creator", "influencer", "model", "blogger", "youtuber", "streamer",
    "photographer", "artist", "stylist", "fashion", "fitness",
    "dad", "mom", "student", "she/her", "he/him", "they/them",
    "personal", "my life", "vlog",
}

JP_CHAR_RE = re.compile(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]")

def _profile_text(profile: Dict[str, Any]) -> Tuple[str, str, str]:
    username = norm_text(profile.get("account_name") or profile.get("username"))
    full_name = norm_text(profile.get("display_name") or profile.get("full_name") or profile.get("name"))
    bio = norm_text(profile.get("caption") or profile.get("biography") or profile.get("bio") or profile.get("signature"))
    return username, full_name, bio

def looks_like_company(profile: Dict[str, Any]) -> bool:
    username, full_name, bio = _profile_text(profile)

    def _tokenize(s: str) -> List[str]:
        return [p for p in re.split(r"[^a-z0-9]+", s) if p]

    name_tokens = set(_tokenize(full_name)) | set(_tokenize(username))
    for tok in COMPANY_NAME_TOKENS:
        if tok in name_tokens:
            return True

    for kw in COMPANY_BIO_KEYWORDS:
        if kw in bio:
            return True

    if "link in bio" in bio and ("shop" in bio or "order" in bio or "discount" in bio):
        return True

    return False

def looks_like_person(profile: Dict[str, Any]) -> bool:
    _, full_name, bio = _profile_text(profile)

    for kw in PERSON_HINT_KEYWORDS:
        if kw in bio:
            return True

    if len(full_name.split()) >= 2 and all(len(x) >= 2 for x in full_name.split()[:2]):
        return True

    return False

def is_japanese_influencer(profile: Dict[str, Any]) -> bool:
    _, full_name, bio = _profile_text(profile)
    return (JP_CHAR_RE.search(full_name) is not None) or (JP_CHAR_RE.search(bio) is not None)

def influencer_filter(profile: Dict[str, Any]) -> bool:
    if JP_STRICT and not is_japanese_influencer(profile):
        return False
    if int(profile.get("followers") or 0) < MIN_FOLLOWERS:
        return False
    if INFLUENCER_STRICT and bool(profile.get("is_business")):
        return False
    if looks_like_company(profile):
        return False
    if not looks_like_person(profile):
        return False
    return True

# -----------------------
# Supabase REST helpers
# -----------------------
def sb_headers(prefer: Optional[str] = None) -> Dict[str, str]:
    h = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h

def sb_storage_headers(content_type: str, upsert: bool = True) -> Dict[str, str]:
    h = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type,
    }
    if upsert:
        h["x-upsert"] = "true"
    return h

def sb_get(table: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.get(url, params=params, headers=sb_headers(), timeout=60)
    if not r.ok:
        raise RuntimeError(f"Supabase GET error {r.status_code}: {r.text[:800]}")
    out = r.json()
    return out if isinstance(out, list) else []

def sb_upsert(table: str, rows: List[Dict[str, Any]], on_conflict: Optional[str], select: str = "id") -> List[Dict[str, Any]]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params: Dict[str, str] = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    if select:
        params["select"] = select

    r = requests.post(
        url,
        params=params,
        headers=sb_headers("resolution=merge-duplicates, return=representation"),
        data=json.dumps(rows),
        timeout=60,
    )
    if not r.ok:
        raise RuntimeError(f"Supabase upsert error {r.status_code}: {r.text[:800]}")
    out = r.json()
    return out if isinstance(out, list) else []

def sb_patch(table: str, where_params: Dict[str, str], fields: Dict[str, Any]) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.patch(
        url,
        params=where_params,
        headers=sb_headers("return=minimal"),
        data=json.dumps(fields),
        timeout=60,
    )
    if not r.ok:
        raise RuntimeError(f"Supabase PATCH error {r.status_code}: {r.text[:800]}")

# -----------------------
# Storage (profile images)
# -----------------------
def infer_image_ext(content_type: str, url: str) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct == "image/png":
        return ".png"
    if ct == "image/webp":
        return ".webp"
    if ct == "image/gif":
        return ".gif"
    if ct in ("image/jpeg", "image/jpg"):
        return ".jpg"
    m = re.search(r"\.(jpg|jpeg|png|webp|gif)(\?|$)", url.lower())
    if m:
        ext = m.group(1)
        return ".jpg" if ext == "jpeg" else f".{ext}"
    return ".jpg"

def storage_public_url(object_path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{PROFILE_IMAGE_BUCKET}/{object_path}"

def upload_profile_image(image_url: str, platform_user_id: str) -> Optional[str]:
    if not image_url:
        return None
    public_prefix = f"{SUPABASE_URL}/storage/v1/object/public/{PROFILE_IMAGE_BUCKET}/"
    if image_url.startswith(public_prefix):
        return image_url

    try:
        resp = requests.get(image_url, timeout=30)
        if not resp.ok:
            print(f"Image download failed {resp.status_code}: {image_url}")
            return None
        content_type = resp.headers.get("Content-Type", "image/jpeg")
        ext = infer_image_ext(content_type, image_url)
        object_path = f"tiktok/{platform_user_id}{ext}"
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{PROFILE_IMAGE_BUCKET}/{object_path}"
        up = requests.post(
            upload_url,
            headers=sb_storage_headers(content_type, upsert=True),
            data=resp.content,
            timeout=30,
        )
        if not up.ok:
            print(f"Storage upload failed {up.status_code}: {up.text[:200]}")
            return None
        return storage_public_url(object_path)
    except Exception as exc:
        print(f"Image upload error: {exc}")
        return None

# -----------------------
# Keyword cycle
# -----------------------
def load_keyword_cycle(pool: List[str]) -> List[str]:
    try:
        with open(CYCLE_STATE_PATH, "r", encoding="utf-8") as f:
            raw = f.read().strip()
            if not raw:
                return []
            data = json.loads(raw)
            remaining = data.get("remaining", [])
            return [k for k in remaining if k in pool]
    except FileNotFoundError:
        return []
    except Exception as exc:
        print(f"Keyword cycle load error: {exc}")
        return []

def save_keyword_cycle(remaining: List[str]) -> None:
    try:
        with open(CYCLE_STATE_PATH, "w", encoding="utf-8") as f:
            json.dump({"remaining": remaining}, f, ensure_ascii=False)
    except Exception as exc:
        print(f"Keyword cycle save error: {exc}")

def pick_keywords_for_run(pool: List[str], count: int) -> List[str]:
    cleaned = [k.strip() for k in pool if k and k.strip()]
    if not cleaned:
        raise RuntimeError("TIKTOK_KEYWORD_POOL is empty.")
    remaining = load_keyword_cycle(cleaned)

    selected: List[str] = []
    if len(remaining) >= count:
        selected = remaining[:count]
        remaining = remaining[count:]
    else:
        selected = remaining[:]
        remaining = []
        needed = count - len(selected)
        new_cycle = cleaned[:]
        random.shuffle(new_cycle)
        selected.extend(new_cycle[:needed])
        remaining = new_cycle[needed:]

    save_keyword_cycle(remaining)
    return selected

# -----------------------
# Apify runner (generic)
# -----------------------
def apify_run_actor_sync_get_items(actor_id: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Uses run-sync-get-dataset-items endpoint for simplicity.
    If your actor doesn't support it well, switch to run->poll like your current code.
    """
    url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
    r = requests.post(url, params={"token": APIFY_TOKEN, "clean": "true"}, json=payload, timeout=300)
    if not r.ok:
        raise RuntimeError(f"Apify error {r.status_code}: {r.text[:1200]}")
    data = r.json()
    return data if isinstance(data, list) else []

def substitute_template(obj: Any, subs: Dict[str, str]) -> Any:
    """
    Recursively replaces "{placeholder}" strings inside dict/list/str.
    """
    if isinstance(obj, dict):
        return {k: substitute_template(v, subs) for k, v in obj.items()}
    if isinstance(obj, list):
        return [substitute_template(x, subs) for x in obj]
    if isinstance(obj, str):
        out = obj
        for k, v in subs.items():
            out = out.replace("{" + k + "}", v)
        # allow numeric fields stored as strings in template
        if out.isdigit():
            return int(out)
        return out
    return obj

# -----------------------
# Parsing (authors + posts)
# -----------------------
def parse_author_from_item(it: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    author = it.get("authorMeta") or it.get("author") or it.get("authorInfo") or {}
    if not isinstance(author, dict):
        author = {}

    username = first(author, "name", "uniqueId", "username", "id")
    if not username:
        nested = (it.get("author") or {})
        if isinstance(nested, dict):
            username = first(nested, "uniqueId", "name", "username", "id")

    if not username:
        return None

    username = str(username).lstrip("@")

    followers = to_int(first(author, "fans", "followers", "followerCount", "fansCount")) or 0
    following = to_int(first(author, "following", "followingCount")) or 0
    bio = first(author, "signature", "bio", "description")
    posts = to_int(first(author, "video", "videos"))

    avatar = first(author, "avatar", "avatarThumb", "avatarMedium", "avatarLarger", "profileImageUrl")
    profile_image_url = str(avatar).strip() if avatar else DEFAULT_PROFILE_IMAGE_URL

    verified = first(author, "verified", "isVerified")
    max_likes = to_int(first(author, "heart", "heartCount", "digg", "diggCount", "likes", "likeCount"))

    return {
        "account_name": username,
        "account_url": f"https://www.tiktok.com/@{username}",
        "caption": bio,
        "profile_image_url": profile_image_url,
        "is_verified": bool(verified) if verified is not None else None,
        "followers": int(followers),
        "following": int(following),
        "maximum_likes": max_likes,
        "posts": posts,
    }

def parse_post_from_item(it: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    ext_id = first(it, "id", "itemId", "videoId", "awemeId")
    if not ext_id:
        return None

    text = first(it, "text", "desc", "caption") or ""
    link = first(it, "webVideoUrl", "videoUrl", "url", "shareUrl")

    created = first(it, "createTime", "createdAt", "create_time")
    posted_at = None
    if created is not None:
        try:
            if isinstance(created, (int, float)) or (isinstance(created, str) and str(created).isdigit()):
                epoch = int(created)
                posted_at = datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()
            else:
                posted_at = datetime.fromisoformat(str(created).replace("Z", "+00:00")).isoformat()
        except Exception:
            posted_at = None

    likes = to_int(first(it, "diggCount", "likes", "likeCount"))
    comments = to_int(first(it, "commentCount", "comments"))
    views = to_int(first(it, "playCount", "views", "viewCount"))
    shares = to_int(first(it, "shareCount", "shares"))

    return {
        "external_post_id": str(ext_id),
        "content_text": text,
        "caption": text,
        "link": link,
        "posted_at": posted_at,
        "scraped_at": utcnow_iso(),
        "metrics": {
            "likes": likes,
            "comments": comments,
            "views": views,
            "shares": shares,
        },
    }

# -----------------------
# Trending logic (DB-only)
# -----------------------
def get_recent_followers_series(account_id: int, points: int) -> List[Tuple[str, int]]:
    rows = sb_get("accounts_metrics", {
        "select": "metric_date,followers",
        "account_id": f"eq.{account_id}",
        "order": "metric_date.desc",
        "limit": str(points),
    })
    out: List[Tuple[str, int]] = []
    for r in rows:
        out.append((str(r.get("metric_date")), int(r.get("followers") or 0)))
    return out

def is_trending_db_only(account_id: int) -> bool:
    series = get_recent_followers_series(account_id, TREND_DAYS + 1)

    if not series:
        return False

    latest_followers = series[0][1]
    if latest_followers >= HIGH_FOLLOWERS_THRESHOLD:
        return True

    if len(series) < TREND_DAYS + 1:
        return False

    deltas: List[int] = []
    for i in range(TREND_DAYS):
        latest = series[i][1]
        prev = series[i + 1][1]
        deltas.append(latest - prev)

    if any(d <= 0 for d in deltas):
        return False

    most_recent_delta = deltas[0]
    prev_followers = series[1][1]
    pct = (most_recent_delta * 100.0 / prev_followers) if prev_followers > 0 else 0.0

    if most_recent_delta >= MIN_DAILY_GROWTH_ABS:
        return True
    if pct >= MIN_DAILY_GROWTH_PCT:
        return True

    avg_delta = sum(deltas) / len(deltas)
    avg_pct = (avg_delta * 100.0 / prev_followers) if prev_followers > 0 else 0.0
    return (avg_delta >= MIN_DAILY_GROWTH_ABS) or (avg_pct >= MIN_DAILY_GROWTH_PCT)

# -----------------------
# DB helpers
# -----------------------
def merge_keywords(existing: Optional[str], new_kw: str) -> str:
    new_kw = new_kw.strip()
    if not existing:
        return new_kw
    parts = [p.strip() for p in existing.split(",") if p.strip()]
    lower = {p.lower() for p in parts}
    if new_kw.lower() not in lower:
        parts.append(new_kw)
    return ", ".join(parts)

def ensure_minimal_account_row(platform: str, account_name: str, account_url: str, followers: int) -> Optional[int]:
    if followers < MIN_FOLLOWERS:
        return None

    resp = sb_upsert(
        "sns_accounts",
        [{
            "platform": platform,
            "account_name": account_name,
            "account_url": account_url,
            "profile_image_url": DEFAULT_PROFILE_IMAGE_URL,
            "language": TIKTOK_LANGUAGE,
            "country": "JP",
        }],
        on_conflict="platform,account_name",
        select="id",
    )
    return int(resp[0]["id"])

def upsert_accounts_metrics(account_id: int, followers: int, following: int, maximum_likes: Optional[int], posts: Optional[int]) -> None:
    sb_upsert(
        "accounts_metrics",
        [{
            "account_id": account_id,
            "metric_date": today_iso(),
            "followers": followers,
            "following": following,
            "maximum_likes": maximum_likes,
            "posts": posts,
            "created_at": utcnow_iso(),
        }],
        on_conflict="account_id,metric_date",
        select="id",
    )

def upsert_full_sns_account_tiktok(account_id: int, author: Dict[str, Any], keyword: Optional[str]) -> None:
    existing = sb_get("sns_accounts", {"select": "id,keywords", "id": f"eq.{account_id}", "limit": "1"})
    existing_keywords = existing[0].get("keywords") if existing else None
    merged = merge_keywords(existing_keywords, keyword) if keyword else (existing_keywords or "")

    stored_image_url = upload_profile_image(
        author.get("profile_image_url"),
        author.get("account_name") or str(account_id),
    )

    row = {
        "id": account_id,
        "platform": "tiktok",
        "country": "JP",
        "language": TIKTOK_LANGUAGE,
        "caption": author.get("caption"),
        "account_url": author.get("account_url"),
        "account_name": author.get("account_name"),
        "is_verified": author.get("is_verified"),
        "profile_image_url": stored_image_url or author.get("profile_image_url") or DEFAULT_PROFILE_IMAGE_URL,
        "keywords": merged if merged else None,
        "last_profile_scraped_at": utcnow_iso(),
    }

    sb_upsert("sns_accounts", [row], on_conflict="id", select="id")

def upsert_posts_and_metrics(account_id: int, items: List[Dict[str, Any]]) -> None:
    parsed = [p for p in (parse_post_from_item(x) for x in items) if p]
    if not parsed:
        return

    post_rows = [{
        "account_id": account_id,
        "media_type": "video",
        "content_text": p["content_text"],
        "caption": p["caption"],
        "link": p.get("link"),
        "posted_at": p.get("posted_at"),
        "scraped_at": p.get("scraped_at"),
        "external_post_id": p["external_post_id"],
    } for p in parsed]

    upserted_posts = sb_upsert("posts", post_rows, on_conflict="external_post_id", select="id,external_post_id")
    post_id_by_ext = {r["external_post_id"]: int(r["id"]) for r in upserted_posts}

    captured_at = utcnow_iso()
    metric_rows: List[Dict[str, Any]] = []
    for p in parsed:
        post_id = post_id_by_ext.get(p["external_post_id"])
        if not post_id:
            continue

        m = p["metrics"]
        views = int(m.get("views") or 0)
        likes = int(m.get("likes") or 0)
        comments_count = int(m.get("comments") or 0)
        metric_rows.append({
            "post_id": post_id,
            "views": views,
            "likes": likes,
            "comments_count": comments_count,
            "duration_seconds": None,
            "like_view_rate": (likes / views) if views > 0 else 0.0,
            "comment_view_rate": (comments_count / views) if views > 0 else 0.0,
            "captured_at": captured_at,
            "created_at": captured_at,
        })

    if metric_rows:
        sb_upsert("post_metrics_snapshots", metric_rows, on_conflict=None, select="id")

def mark_posts_scraped(account_id: int) -> None:
    sb_patch(
        "sns_accounts",
        where_params={"id": f"eq.{account_id}"},
        fields={"last_posts_scraped_at": utcnow_iso()},
    )

def should_scrape_posts_now(row: Dict[str, Any]) -> bool:
    last = iso_to_dt(row.get("last_posts_scraped_at"))
    if not last:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(hours=TIKTOK_POSTS_REFRESH_HOURS)
    return last < cutoff

# -----------------------
# DB queries for modes
# -----------------------
def db_candidates_for_keyword(keyword: str) -> List[Dict[str, Any]]:
    # If you store keywords in sns_accounts.keywords as comma-separated strings:
    return sb_get("sns_accounts", {
        "select": "id,platform,account_name,account_url,keywords,last_profile_scraped_at,last_posts_scraped_at",
        "platform": "eq.tiktok",
        "keywords": f"ilike.*{keyword}*",
        "limit": str(MAX_DB_CANDIDATES_FETCH),
        "order": "id.desc",
    })

def keyword_pool_is_stale(rows: List[Dict[str, Any]]) -> bool:
    if not rows:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(days=DISCOVERY_STALE_DAYS)
    for r in rows:
        dt = iso_to_dt(r.get("last_profile_scraped_at"))
        if dt and dt >= cutoff:
            return False
    return True

def db_tiktok_accounts_for_monitoring(limit: int) -> List[Dict[str, Any]]:
    # Pull candidate accounts. You can tighten this later (e.g., only those with enough metrics points).
    return sb_get("sns_accounts", {
        "select": "id,platform,account_name,account_url,last_posts_scraped_at",
        "platform": "eq.tiktok",
        "limit": str(limit),
        "order": "id.desc",
    })

# -----------------------
# Payload builders
# -----------------------
def build_search_payload(keyword: str) -> Dict[str, Any]:
    subs = {
        "keyword": keyword,
        "maxItems": str(TIKTOK_MAX_ITEMS),
        "proxyCountry": str(TIKTOK_PROXY_COUNTRY),
    }
    return substitute_template(APIFY_TIKTOK_SEARCH_PAYLOAD_TEMPLATE, subs)

def build_profile_payload(username: str) -> Dict[str, Any]:
    subs = {
        "username": username.lstrip("@"),
        "maxItems": str(TIKTOK_POSTS_PER_INFLUENCER),
        "proxyCountry": str(TIKTOK_PROXY_COUNTRY),
    }
    return substitute_template(APIFY_TIKTOK_PROFILE_PAYLOAD_TEMPLATE, subs)

# -----------------------
# Modes
# -----------------------
def run_discovery() -> None:
    keywords = pick_keywords_for_run(TIKTOK_KEYWORD_POOL, TIKTOK_KEYWORDS_PER_RUN)
    print("MODE=discovery | keywords:", keywords)
    print("Discovery settings:", {
        "keywordsPerRun": TIKTOK_KEYWORDS_PER_RUN,
        "maxItemsPerKeyword": TIKTOK_MAX_ITEMS,
        "minFollowers": MIN_FOLLOWERS,
        "staleDays": DISCOVERY_STALE_DAYS,
        "minDbCandidatesPerKeyword": MIN_DB_CANDIDATES_PER_KEYWORD,
        "searchActor": APIFY_TIKTOK_SEARCH_ACTOR,
    })

    for kw in keywords:
        print(f"\n=== keyword: {kw} ===")

        candidates = db_candidates_for_keyword(kw)
        need_discovery = (len(candidates) < MIN_DB_CANDIDATES_PER_KEYWORD) or keyword_pool_is_stale(candidates)
        print("DB candidates:", len(candidates), "| need_discovery:", need_discovery)
        if not need_discovery:
            continue

        payload = build_search_payload(kw)
        items = apify_run_actor_sync_get_items(APIFY_TIKTOK_SEARCH_ACTOR, payload)
        print("Apify items returned:", len(items))

        # collect unique authors passing filters
        authors: Dict[str, Dict[str, Any]] = {}
        for it in items:
            a = parse_author_from_item(it)
            if not a:
                continue
            if int(a.get("followers") or 0) < MIN_FOLLOWERS:
                continue
            if not influencer_filter(a):
                continue
            uname = a["account_name"]
            authors[uname] = a

        print("Authors kept after filter:", len(authors))

        # write minimal account + metrics for today
        for uname, a in authors.items():
            account_id = ensure_minimal_account_row("tiktok", uname, a["account_url"], int(a.get("followers") or 0))
            if not account_id:
                continue

            # keep keyword association + richer profile metadata
            upsert_full_sns_account_tiktok(account_id, a, kw)

            upsert_accounts_metrics(
                account_id,
                a["followers"],
                a["following"],
                a.get("maximum_likes"),
                a.get("posts"),
            )
            time.sleep(0.1)

    print("\nDiscovery done.")

def run_monitoring() -> None:
    print("MODE=monitoring")
    print("Monitoring settings:", {
        "maxInfluencersPerRun": TIKTOK_MAX_INFLUENCERS_PER_RUN,
        "postsPerInfluencer": TIKTOK_POSTS_PER_INFLUENCER,
        "postsRefreshHours": TIKTOK_POSTS_REFRESH_HOURS,
        "profileActor": APIFY_TIKTOK_PROFILE_ACTOR,
    })

    # Fetch recent accounts, filter to trending + due for scraping
    rows = db_tiktok_accounts_for_monitoring(limit=500)

    due: List[Dict[str, Any]] = []
    for r in rows:
        if not r.get("account_name"):
            continue
        if not should_scrape_posts_now(r):
            continue
        account_id = int(r["id"])
        if not is_trending_db_only(account_id):
            continue
        due.append(r)

    # cap per run
    due = due[:TIKTOK_MAX_INFLUENCERS_PER_RUN]
    print("Trending & due accounts:", len(due))

    for acc in due:
        account_id = int(acc["id"])
        username = str(acc.get("account_name") or "").lstrip("@")
        if not username:
            continue

        print(f"Scraping posts for @{username} (id={account_id})")
        payload = build_profile_payload(username)
        items = apify_run_actor_sync_get_items(APIFY_TIKTOK_PROFILE_ACTOR, payload)
        print("  items:", len(items))

        upsert_posts_and_metrics(account_id, items)
        mark_posts_scraped(account_id)

        time.sleep(0.2)

    print("\nMonitoring done.")

# -----------------------
# Main
# -----------------------
def main() -> None:
    if MODE == "discovery":
        run_discovery()
    elif MODE == "monitoring":
        run_monitoring()
    else:
        raise RuntimeError("MODE must be 'discovery' or 'monitoring'")

if __name__ == "__main__":
    main()
