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

def safe_int(v: Any, default: int = 0) -> int:
    try:
        if v is None:
            return default
        if isinstance(v, bool):
            return default
        return int(v)
    except Exception:
        return default

# -----------------------
# Config
# -----------------------
MODE = env_str("MODE", "discovery").lower()  # discovery | monitoring

APIFY_TOKEN = must_env("APIFY_TOKEN")
SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")
PROFILE_IMAGE_BUCKET = env_str("PROFILE_IMAGE_BUCKET", "profile_images") or "profile_images"

DEFAULT_PROFILE_IMAGE_URL = env_str(
    "DEFAULT_PROFILE_IMAGE_URL",
    "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
)

KEYWORD_POOL = [
'コスメ',
'スキンケア',
'グルメ',
'新商品',
'レビュー',
'開封',
'ファッション',
'ガジェット',
'家電',
'ダイエット',
'筋トレ',
'旅行',
'カフェ',
'おすすめ',
'比較',
'ベストバイ',
'育児',
'美容',
'ルーティン',
'ライフスタイル']

# Discovery knobs
X_KEYWORDS_PER_RUN = env_int("X_KEYWORDS_PER_RUN", 20)    
X_MAX_ITEMS = env_int("X_MAX_ITEMS", 200)                  
X_TWEET_LANGUAGE = env_str("X_TWEET_LANGUAGE", "ja")
X_SORT = env_str("X_SORT", "Latest")

# Monitoring knobs
X_MAX_INFLUENCERS_PER_RUN = env_int("X_MAX_INFLUENCERS_PER_RUN", 60)
X_TWEETS_PER_INFLUENCER = env_int("X_TWEETS_PER_INFLUENCER", 25) 
X_POSTS_REFRESH_HOURS = env_int("X_POSTS_REFRESH_HOURS", 3)      

MIN_FOLLOWERS = env_int("MIN_FOLLOWERS", 10_000)

# Trending thresholds
HIGH_FOLLOWERS_THRESHOLD = env_int("HIGH_FOLLOWERS_THRESHOLD", 100_000)
MIN_DAILY_GROWTH_PCT = env_float("MIN_DAILY_GROWTH_PCT", 0.5)
MIN_DAILY_GROWTH_ABS = env_int("MIN_DAILY_GROWTH_ABS", 500)
TREND_DAYS = env_int("TREND_DAYS", 3)

# DB gating knobs (discovery)
DISCOVERY_STALE_DAYS = env_int("DISCOVERY_STALE_DAYS", 14)
MIN_DB_CANDIDATES_PER_KEYWORD = env_int("MIN_DB_CANDIDATES_PER_KEYWORD", 80)
MAX_DB_CANDIDATES_FETCH = env_int("MAX_DB_CANDIDATES_FETCH", 300)

# cycle state
CYCLE_STATE_PATH = os.path.join(os.path.dirname(__file__), ".keyword_cycle_x.json")

JP_STRICT = env_bool("JP_STRICT", True)
INFLUENCER_STRICT = env_bool("INFLUENCER_STRICT", False)

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
    "studio", "agency", "brand", "boutique", "restaurant", "hotel", "clinic", "news", "show", "staff"
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
    full_name = norm_text(
        profile.get("display_name")
        or profile.get("full_name")
        or profile.get("name")
        or profile.get("author_name")
    )
    bio = norm_text(profile.get("caption") or profile.get("biography") or profile.get("bio"))
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

    if full_name and len(full_name.split()) >= 2 and all(len(x) >= 2 for x in full_name.split()[:2]):
        return True

    return not INFLUENCER_STRICT

def is_japanese_influencer(profile: Dict[str, Any]) -> bool:
    _, full_name, bio = _profile_text(profile)
    return (JP_CHAR_RE.search(full_name) is not None) or (JP_CHAR_RE.search(bio) is not None)

def influencer_filter(profile: Dict[str, Any]) -> bool:
    if safe_int(profile.get("followers"), 0) < MIN_FOLLOWERS:
        return False
    if JP_STRICT and not is_japanese_influencer(profile):
        return False
    if looks_like_company(profile):
        return False
    if not looks_like_person(profile):
        return False
    return True

# -----------------------
# Supabase helpers
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
    r = requests.patch(url, params=where_params, headers=sb_headers("return=minimal"), data=json.dumps(fields), timeout=60)
    if not r.ok:
        raise RuntimeError(f"Supabase PATCH error {r.status_code}: {r.text[:800]}")

def supabase_table_columns(table: str) -> Set[str]:
    try:
        rows = sb_get(table, {"select": "*", "limit": "1"})
        if rows:
            return set(rows[0].keys())
    except Exception:
        pass

    if table == "post_metrics_snapshots":
        return {
            "post_id",
            "views",
            "likes",
            "comments_count",
            "duration_seconds",
            "like_view_rate",
            "comment_view_rate",
            "captured_at",
            "created_at",
        }
    if table == "posts":
        return {"id", "account_id", "external_post_id", "content_text", "caption", "link", "posted_at", "scraped_at"}
    if table == "sns_accounts":
        return {"id", "platform", "account_name", "account_url", "caption", "profile_image_url", "is_verified", "language", "country", "keywords", "last_posts_scraped_at", "last_profile_scraped_at"}
    if table == "accounts_metrics":
        return {"account_id", "metric_date", "followers", "following", "created_at", "posts", "maximum_likes"}
    return set()

POSTS_COLUMNS = supabase_table_columns("posts")
POST_METRICS_COLUMNS = supabase_table_columns("post_metrics_snapshots")
SNS_ACCOUNTS_COLUMNS = supabase_table_columns("sns_accounts")
ACCOUNTS_METRICS_COLUMNS = supabase_table_columns("accounts_metrics")

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

def is_default_x_avatar(url: str) -> bool:
    if not url:
        return True
    return "abs.twimg.com/sticky/default_profile_images/" in url.lower()

def upgrade_x_avatar(url: str) -> str:
    if not url:
        return url
    return url.replace("_normal", "_400x400")

def image_download_headers(referer: str = "https://x.com/") -> Dict[str, str]:
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Referer": referer,
    }

def upload_profile_image(image_url: str, platform_user_id: str) -> Optional[str]:
    if not image_url:
        return None
    image_url = image_url.strip()
    if is_default_x_avatar(image_url):
        return None

    public_prefix = f"{SUPABASE_URL}/storage/v1/object/public/{PROFILE_IMAGE_BUCKET}/"
    if image_url.startswith(public_prefix):
        return image_url

    image_url = upgrade_x_avatar(image_url)

    try:
        resp = requests.get(image_url, headers=image_download_headers(), timeout=30)
        if not resp.ok:
            return None

        content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if not content_type.startswith("image/"):
            return None

        ext = infer_image_ext(content_type, image_url)
        object_path = f"x/{platform_user_id}{ext}"
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{PROFILE_IMAGE_BUCKET}/{object_path}"

        up = requests.post(upload_url, headers=sb_storage_headers(content_type, upsert=True), data=resp.content, timeout=30)
        if not up.ok:
            return None

        return storage_public_url(object_path)
    except Exception:
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
    except Exception:
        return []

def save_keyword_cycle(remaining: List[str]) -> None:
    try:
        with open(CYCLE_STATE_PATH, "w", encoding="utf-8") as f:
            json.dump({"remaining": remaining}, f, ensure_ascii=False)
    except Exception:
        return

def pick_keywords_for_run(pool: List[str], count: int) -> List[str]:
    cleaned = [k.strip() for k in pool if k and k.strip()]
    if not cleaned:
        raise RuntimeError("KEYWORD_POOL is empty.")
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
# Apify: apidojo~tweet-scraper
# -----------------------
def apify_run(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = "https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items"
    r = requests.post(url, params={"token": APIFY_TOKEN, "clean": "true"}, json=payload, timeout=300)
    if not r.ok:
        raise RuntimeError(f"Apify error {r.status_code}: {r.text[:1200]}")
    data = r.json()
    return data if isinstance(data, list) else []

# -----------------------
# Parsing
# -----------------------
def parse_author(raw_tweet: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    a = raw_tweet.get("author")
    if not isinstance(a, dict):
        return None

    username = first(a, "userName", "username", "screenName", "handle")
    if not username:
        return None
    username = str(username).lstrip("@")

    display_name = first(a, "name", "displayName", "display_name", "fullName", "full_name")

    avatar = first(
        a,
        "profilePicture",
        "profilePictureUrl",
        "profileImageUrl",
        "profileImage",
        "avatar",
        "imageUrl",
        "profile_image_url",
        "profile_image",
    )
    if isinstance(avatar, dict):
        avatar = first(avatar, "url", "imageUrl", "src")
    profile_image_url = str(avatar).strip() if avatar else None

    return {
        "account_name": username,
        "display_name": display_name,
        "account_url": f"https://x.com/{username}",
        "caption": first(a, "description", "bio"),
        "profile_image_url": profile_image_url,
        "is_verified": bool(first(a, "isVerified", "verified", "isBlueVerified")) if first(a, "isVerified", "verified", "isBlueVerified") is not None else None,
        "followers": safe_int(first(a, "followersCount", "followers"), 0),
        "following": safe_int(first(a, "friendsCount", "following"), 0),
        "posts": safe_int(first(a, "mediaCount", "statusesCount", "posts"), 0),
        "maximum_likes": safe_int(first(a, "likeCount", "likes"), 0),
    }

def parse_tweet(raw_tweet: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    tid = first(raw_tweet, "id", "tweetId", "restId")
    if not tid:
        return None

    posted_at = first(raw_tweet, "createdAt", "created_at", "time")

    return {
        "external_post_id": str(tid),
        "content_text": first(raw_tweet, "text", "fullText", "content") or "",
        "caption": first(raw_tweet, "text", "fullText", "content") or "",
        "link": first(raw_tweet, "url", "twitterUrl", "tweetUrl"),
        "posted_at": posted_at,
        "scraped_at": utcnow_iso(),
        "metrics": {
            "likes": first(raw_tweet, "likeCount", "favoriteCount", "likes"),
            "comments": first(raw_tweet, "replyCount", "replies"),
            "views": first(raw_tweet, "viewCount", "views"),
            "retweets": first(raw_tweet, "retweetCount", "retweets"),
            "quotes": first(raw_tweet, "quoteCount", "quotes"),
        }
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
        out.append((str(r.get("metric_date")), safe_int(r.get("followers"), 0)))
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
        deltas.append(series[i][1] - series[i + 1][1])

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
    new_kw = (new_kw or "").strip()
    if not new_kw:
        return existing or ""
    if not existing:
        return new_kw
    parts = [p.strip() for p in existing.split(",") if p.strip()]
    lower = {p.lower() for p in parts}
    if new_kw.lower() not in lower:
        parts.append(new_kw)
    return ", ".join(parts)

def ensure_minimal_account_row(account_name: str, followers: int, profile_image_url: Optional[str], keyword: str) -> Optional[int]:
    if followers < MIN_FOLLOWERS:
        return None

    img = (profile_image_url or "").strip() or DEFAULT_PROFILE_IMAGE_URL

    row = {
        "platform": "x",
        "account_name": account_name,
        "account_url": f"https://x.com/{account_name}",
        "profile_image_url": img,
        "keywords": (keyword or "").strip() or None,
        "language": X_TWEET_LANGUAGE,
        "country": "JP" if X_TWEET_LANGUAGE == "ja" else None,
        "last_profile_scraped_at": utcnow_iso(),
    }
    row = {k: v for k, v in row.items() if k in SNS_ACCOUNTS_COLUMNS}

    resp = sb_upsert("sns_accounts", [row], on_conflict="platform,account_name", select="id")
    return int(resp[0]["id"])

def upsert_accounts_metrics(account_id: int, followers: int, following: int, posts: int, maximum_likes: Optional[int]) -> None:
    row = {
        "account_id": account_id,
        "metric_date": today_iso(),
        "followers": followers,
        "following": following,
        "created_at": utcnow_iso(),
        "posts": posts,
        "maximum_likes": maximum_likes,
    }
    row = {k: v for k, v in row.items() if k in ACCOUNTS_METRICS_COLUMNS}
    sb_upsert("accounts_metrics", [row], on_conflict="account_id,metric_date", select="id")

def upsert_full_sns_account_x(account_id: int, author: Dict[str, Any], keyword: str) -> None:
    existing = sb_get("sns_accounts", {"select": "id,keywords", "id": f"eq.{account_id}", "limit": "1"})
    existing_keywords = existing[0].get("keywords") if existing else None
    merged = merge_keywords(existing_keywords, keyword)

    stored_image_url = upload_profile_image(author.get("profile_image_url"), author.get("account_name") or str(account_id))
    final_img = stored_image_url or author.get("profile_image_url")
    if final_img and is_default_x_avatar(final_img):
        final_img = None

    row = {
        "id": account_id,
        "platform": "x",
        "account_name": author["account_name"],
        "account_url": author["account_url"],
        "caption": author.get("caption"),
        "profile_image_url": final_img or DEFAULT_PROFILE_IMAGE_URL,
        "is_verified": author.get("is_verified"),
        "language": X_TWEET_LANGUAGE,
        "country": "JP" if X_TWEET_LANGUAGE == "ja" else None,
        "keywords": merged,
        "last_profile_scraped_at": utcnow_iso(),
    }
    row = {k: v for k, v in row.items() if k in SNS_ACCOUNTS_COLUMNS}
    sb_upsert("sns_accounts", [row], on_conflict="id", select="id")

def upsert_posts_and_metrics(account_id: int, tweets_raw: List[Dict[str, Any]]) -> None:
    parsed = [t for t in (parse_tweet(x) for x in tweets_raw) if t]
    if not parsed:
        return

    post_rows: List[Dict[str, Any]] = []
    for t in parsed:
        row = {
            "account_id": account_id,
            "external_post_id": t["external_post_id"],
            "content_text": t["content_text"],
            "caption": t["caption"],
            "link": t.get("link"),
            "posted_at": t.get("posted_at"),
            "scraped_at": t.get("scraped_at"),
            "media_type": None,
        }
        row = {k: v for k, v in row.items() if k in POSTS_COLUMNS}
        post_rows.append(row)

    upserted = sb_upsert("posts", post_rows, on_conflict="external_post_id", select="id,external_post_id")
    post_id_by_ext = {r["external_post_id"]: int(r["id"]) for r in upserted}

    has_captured_at = "captured_at" in POST_METRICS_COLUMNS
    captured_at = utcnow_iso()
    metric_rows: List[Dict[str, Any]] = []

    for t in parsed:
        post_id = post_id_by_ext.get(t["external_post_id"])
        if not post_id:
            continue

        m = t["metrics"]
        views = safe_int(m.get("views"), 0) if m.get("views") is not None else 0
        likes = safe_int(m.get("likes"), 0) if m.get("likes") is not None else 0
        comments_count = safe_int(m.get("comments"), 0) if m.get("comments") is not None else 0
        row: Dict[str, Any] = {"post_id": post_id, "created_at": captured_at}
        if has_captured_at:
            row["captured_at"] = captured_at

        # use whichever columns exist
        if "views" in POST_METRICS_COLUMNS:
            row["views"] = views
        if "likes" in POST_METRICS_COLUMNS:
            row["likes"] = likes
        if "comments_count" in POST_METRICS_COLUMNS:
            row["comments_count"] = comments_count
        if "duration_seconds" in POST_METRICS_COLUMNS:
            row["duration_seconds"] = None
        if "like_view_rate" in POST_METRICS_COLUMNS:
            row["like_view_rate"] = (likes / views) if views > 0 else 0.0
        if "comment_view_rate" in POST_METRICS_COLUMNS:
            row["comment_view_rate"] = (comments_count / views) if views > 0 else 0.0

        row = {k: v for k, v in row.items() if k in POST_METRICS_COLUMNS}
        metric_rows.append(row)

    if metric_rows:
        sb_upsert("post_metrics_snapshots", metric_rows, on_conflict=None, select="id")

def mark_posts_scraped(account_id: int) -> None:
    if "last_posts_scraped_at" not in SNS_ACCOUNTS_COLUMNS:
        return
    sb_patch("sns_accounts", {"id": f"eq.{account_id}"}, {"last_posts_scraped_at": utcnow_iso()})

def should_scrape_posts_now(row: Dict[str, Any]) -> bool:
    last = iso_to_dt(row.get("last_posts_scraped_at"))
    if not last:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(hours=X_POSTS_REFRESH_HOURS)
    return last < cutoff

# -----------------------
# DB queries for modes
# -----------------------
def db_candidates_for_keyword(keyword: str) -> List[Dict[str, Any]]:
    if "keywords" not in SNS_ACCOUNTS_COLUMNS:
        return []
    return sb_get("sns_accounts", {
        "select": "id,platform,account_name,account_url,keywords,last_profile_scraped_at,last_posts_scraped_at",
        "platform": "eq.x",
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

def db_x_accounts_for_monitoring(limit: int) -> List[Dict[str, Any]]:
    return sb_get("sns_accounts", {
        "select": "id,platform,account_name,account_url,last_posts_scraped_at",
        "platform": "eq.x",
        "limit": str(limit),
        "order": "id.desc",
    })

# -----------------------
# Modes
# -----------------------
def run_discovery() -> None:
    keywords = pick_keywords_for_run(KEYWORD_POOL, X_KEYWORDS_PER_RUN)
    print("MODE=discovery | keywords:", keywords)
    print("Discovery settings:", {
        "keywordsPerRun": X_KEYWORDS_PER_RUN,
        "maxItems": X_MAX_ITEMS,
        "sort": X_SORT,
        "lang": X_TWEET_LANGUAGE,
        "minFollowers": MIN_FOLLOWERS,
    })

    for kw in keywords:
        candidates = db_candidates_for_keyword(kw)
        need = (len(candidates) < MIN_DB_CANDIDATES_PER_KEYWORD) or keyword_pool_is_stale(candidates)
        print(f"\n=== keyword: {kw} === | DB candidates={len(candidates)} | need_discovery={need}")
        if not need:
            continue

        items = apify_run({
            "searchTerms": [f"{kw} lang:{X_TWEET_LANGUAGE}"],
            "maxItems": X_MAX_ITEMS,
            "sort": X_SORT,
            "tweetLanguage": X_TWEET_LANGUAGE,
            "includeSearchTerms": True,
        })
        print("Tweets returned:", len(items))

        authors: Dict[str, Dict[str, Any]] = {}
        for it in items:
            a = parse_author(it)
            if not a:
                continue
            if safe_int(a.get("followers"), 0) < MIN_FOLLOWERS:
                continue
            if not influencer_filter(a):
                continue
            authors[a["account_name"]] = a

        print("Qualified influencers:", len(authors))

        for uname, a in authors.items():
            account_id = ensure_minimal_account_row(uname, safe_int(a.get("followers"), 0), a.get("profile_image_url"), kw)
            if not account_id:
                continue
            upsert_full_sns_account_x(account_id, a, kw)
            upsert_accounts_metrics(
                account_id,
                safe_int(a.get("followers"), 0),
                safe_int(a.get("following"), 0),
                safe_int(a.get("posts"), 0),
                safe_int(a.get("maximum_likes"), 0),
            )
            time.sleep(0.1)

    print("\nDiscovery done.")

def run_monitoring() -> None:
    print("MODE=monitoring")
    print("Monitoring settings:", {
        "maxInfluencersPerRun": X_MAX_INFLUENCERS_PER_RUN,
        "tweetsPerInfluencer": X_TWEETS_PER_INFLUENCER,
        "postsRefreshHours": X_POSTS_REFRESH_HOURS,
    })

    rows = db_x_accounts_for_monitoring(limit=800)

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

    due = due[:X_MAX_INFLUENCERS_PER_RUN]
    print("Trending & due accounts:", len(due))

    for acc in due:
        account_id = int(acc["id"])
        uname = str(acc["account_name"]).lstrip("@")
        print(f"Scraping tweets for @{uname} (id={account_id})")

        items = apify_run({
            "twitterHandles": [uname],
            "maxItems": X_TWEETS_PER_INFLUENCER,
            "sort": "Latest",
        })
        print("  tweets:", len(items))

        # refresh profile + metrics opportunistically from tweet author data
        if items:
            a = parse_author(items[0])
            if a:
                upsert_full_sns_account_x(account_id, a, keyword="")
                upsert_accounts_metrics(
                    account_id,
                    safe_int(a.get("followers"), 0),
                    safe_int(a.get("following"), 0),
                    safe_int(a.get("posts"), 0),
                    safe_int(a.get("maximum_likes"), 0),
                )

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
