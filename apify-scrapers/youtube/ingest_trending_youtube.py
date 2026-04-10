import os
import re
import json
import random
import time
import requests
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple, Set
from urllib.parse import quote
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
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

def iso_from_any_date(v: Any) -> Optional[str]:
    if not v:
        return None
    s = str(v).strip()
    if not s:
        return None
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        try:
            dt = datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except Exception:
            return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).isoformat()
    except Exception:
        return None

def build_http_session() -> requests.Session:
    s = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.6,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "PUT"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retries)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s

HTTP = build_http_session()

def is_unusable_youtube_avatar(url: Optional[str]) -> bool:
    if not url:
        return True
    s = str(url).strip()
    if not s:
        return True
    lower = s.lower()
    if not (lower.startswith("http://") or lower.startswith("https://")):
        return True
    if "youtube.com/img/favicon" in lower:
        return True
    if "/s/desktop/" in lower:
        return True
    if "youtube" in lower and "favicon" in lower:
        return True
    return False

def normalize_profile_image_url(url: Any) -> Optional[str]:
    if url is None:
        return None
    s = str(url).strip()
    if is_unusable_youtube_avatar(s):
        return None
    return s

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
    "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
).strip()

KEYWORD_POOL = [
'コスメ',
'スキンケア',
'メイク',
'グルメ',
'レシピ',
'ファッション',
'ガジェット',
'家電',
'ダイエット',
'筋トレ',
'旅行',
'Vlog',
'ルーティン',
'比較',
'レビュー',
'開封',
'ベストバイ',
'育児',
'ヘアケア',
'美容']

# Discovery knobs
YT_KEYWORDS_PER_RUN = env_int("YT_KEYWORDS_PER_RUN", 15)       
YT_MAX_RESULTS = env_int("YT_MAX_RESULTS", 120)
YT_MAX_SHORTS = env_int("YT_MAX_SHORTS", 0)
YT_MAX_STREAMS = env_int("YT_MAX_STREAMS", 0)
YT_SORTING_ORDER = env_str("YT_SORTING_ORDER", "relevance")
YT_DATE_FILTER = env_str("YT_DATE_FILTER", "")

# DB gating knobs (discovery)
DISCOVERY_STALE_DAYS = env_int("DISCOVERY_STALE_DAYS", 21)
MIN_DB_CANDIDATES_PER_KEYWORD = env_int("MIN_DB_CANDIDATES_PER_KEYWORD", 60)
MAX_DB_CANDIDATES_FETCH = env_int("MAX_DB_CANDIDATES_FETCH", 300)

# Monitoring knobs
YT_MAX_CHANNELS_PER_RUN = env_int("YT_MAX_CHANNELS_PER_RUN", 40)
YT_TRENDING_CHANNEL_MAX_RESULTS = env_int("YT_TRENDING_CHANNEL_MAX_RESULTS", 30)
YT_POSTS_REFRESH_HOURS = env_int("YT_POSTS_REFRESH_HOURS", 6)  

MIN_FOLLOWERS = env_int("MIN_FOLLOWERS", 10_000)

# Trending thresholds
HIGH_FOLLOWERS_THRESHOLD = env_int("HIGH_FOLLOWERS_THRESHOLD", 100_000)
MIN_DAILY_GROWTH_PCT = env_float("MIN_DAILY_GROWTH_PCT", 0.5)
MIN_DAILY_GROWTH_ABS = env_int("MIN_DAILY_GROWTH_ABS", 500)
TREND_DAYS = env_int("TREND_DAYS", 3)

CYCLE_STATE_PATH = os.path.join(os.path.dirname(__file__), ".keyword_cycle_youtube.json")

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
    return {"post_id", "captured_at", "views", "likes", "comments_count", "like_view_rate", "comment_view_rate"}

POST_METRIC_SNAPSHOTS_COLUMNS = supabase_table_columns("post_metrics_snapshots")

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
    encoded = quote(object_path, safe="/")
    return f"{SUPABASE_URL}/storage/v1/object/public/{PROFILE_IMAGE_BUCKET}/{encoded}"

def image_download_headers(referer: Optional[str] = None) -> Dict[str, str]:
    h = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }
    if referer:
        h["Referer"] = referer
    return h

def download_image_bytes(image_url: str) -> Tuple[Optional[bytes], Optional[str]]:
    header_variants = [
        image_download_headers("https://www.youtube.com/"),
        image_download_headers(None),
    ]
    for headers in header_variants:
        try:
            r = HTTP.get(image_url, headers=headers, timeout=30, allow_redirects=True, stream=True)
            if r.status_code >= 400:
                continue
            content_type = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if not content_type.startswith("image/"):
                chunk = next(r.iter_content(chunk_size=256), b"")
                if b"<html" in chunk.lower() or b"<!doctype" in chunk.lower():
                    continue
            data = r.content
            if not data or len(data) < 200:
                continue
            if not content_type.startswith("image/"):
                content_type = "image/jpeg"
            return data, content_type
        except Exception:
            continue
    return None, None

def upload_profile_image(image_url: Optional[str], platform_user_id: str) -> Optional[str]:
    if not image_url:
        return None
    image_url = str(image_url).strip()
    if not image_url:
        return None

    public_prefix = f"{SUPABASE_URL}/storage/v1/object/public/{PROFILE_IMAGE_BUCKET}/"
    if image_url.startswith(public_prefix):
        return image_url

    data, content_type = download_image_bytes(image_url)
    if not data or not content_type:
        return None

    ext = infer_image_ext(content_type, image_url)
    safe_id = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", str(platform_user_id))
    object_path = f"youtube/{safe_id}{ext}"

    encoded_path = quote(object_path, safe="/")
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{PROFILE_IMAGE_BUCKET}/{encoded_path}"

    try:
        up = HTTP.post(upload_url, headers=sb_storage_headers(content_type, upsert=True), data=data, timeout=30)
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
# Apify: streamers/youtube-scraper
# -----------------------
def apify_run_youtube(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = "https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items"
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            r = requests.post(url, params={"token": APIFY_TOKEN}, json=payload, timeout=600)
            if not r.ok:
                raise RuntimeError(f"Apify error {r.status_code}: {r.text[:800]}")
            data = r.json()
            return data if isinstance(data, list) else []
        except requests.exceptions.ReadTimeout:
            if attempt >= max_attempts:
                raise
            time.sleep(5 * attempt)
    return []

# -----------------------
# Parsing
# -----------------------
CHANNEL_ID_RE = re.compile(r"(?:youtube\.com/(?:channel/|@))([^/?#]+)", re.I)

def extract_channel_key(channel_url: Optional[str], channel_name: Optional[str]) -> Optional[str]:
    if channel_url:
        m = CHANNEL_ID_RE.search(channel_url)
        if m:
            return m.group(1).strip()
    if channel_name:
        return channel_name.strip().lower()
    return None

def parse_channel_from_item(it: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    channel_name = first(it, "channelName")
    channel_url = first(it, "channelUrl", "inputChannelUrl", "fromYTUrl")

    about = it.get("aboutChannelInfo") or {}
    if not isinstance(about, dict):
        about = {}

    subs = to_int(first(it, "numberOfSubscribers", "subscribers", "subscriberCount"))
    if not subs:
        subs = to_int(first(about, "numberOfSubscribers", "subscriberCount"))
    subscribers = int(subs or 0)

    avatar_url = first(it, "channelAvatarUrl", "channelAvatar", "avatarUrl", "avatar")
    if not avatar_url:
        avatar_url = first(about, "channelAvatarUrl", "channelAvatar", "avatarUrl", "avatar")

    profile_image_url = normalize_profile_image_url(avatar_url)
    if not profile_image_url and avatar_url:
        s = str(avatar_url).strip()
        if s.startswith(("http://", "https://")) and ("yt3.googleusercontent.com" in s or "yt3.ggpht.com" in s):
            profile_image_url = s

    if not channel_name and not channel_url:
        return None

    key = extract_channel_key(channel_url, channel_name)
    if not key:
        return None

    return {
        "account_name": key,
        "display_name": channel_name,
        "account_url": channel_url or f"https://www.youtube.com/@{key}",
        "caption": first(it, "channelDescription"),
        "profile_image_url": profile_image_url,
        "followers": subscribers,
        "following": 0,
        "maximum_likes": to_int(first(it, "likes")),
        "posts": to_int(first(about, "channelTotalVideos")),
        "is_verified": None,
    }

def parse_video_from_item(it: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    vid = first(it, "id")
    url = first(it, "url")
    if not vid or not url:
        return None

    posted_at = iso_from_any_date(first(it, "date"))
    likes = to_int(first(it, "likes"))
    comments = to_int(first(it, "commentsCount"))
    views = to_int(first(it, "viewCount"))

    title = first(it, "title") or ""
    desc = first(it, "text") or ""

    return {
        "external_post_id": str(vid),
        "content_text": title,
        "caption": desc or title,
        "link": str(url),
        "posted_at": posted_at,
        "scraped_at": utcnow_iso(),
        "metrics": {"likes": likes, "comments_count": comments, "views": views},    
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
    return [(str(r.get("metric_date")), int(r.get("followers") or 0)) for r in rows]

def is_trending_db_only(account_id: int) -> bool:
    series = get_recent_followers_series(account_id, TREND_DAYS + 1)
    if not series:
        return False

    latest_followers = series[0][1]
    if latest_followers >= HIGH_FOLLOWERS_THRESHOLD:
        return True
    if len(series) < TREND_DAYS + 1:
        return False

    deltas = [series[i][1] - series[i + 1][1] for i in range(TREND_DAYS)]
    if any(d <= 0 for d in deltas):
        return False

    most_recent_delta = deltas[0]
    prev_followers = series[1][1]
    pct = (most_recent_delta * 100.0 / prev_followers) if prev_followers > 0 else 0.0

    if most_recent_delta >= MIN_DAILY_GROWTH_ABS:
        return True
    if pct >= MIN_DAILY_GROWTH_PCT:
        return True
    return False

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

def ensure_minimal_account_row(account_name: str, account_url: str, keyword: str) -> int:
    row = {
        "platform": "youtube",
        "account_name": account_name,
        "account_url": account_url,
        "profile_image_url": DEFAULT_PROFILE_IMAGE_URL,  # minimal placeholder
        "keywords": (keyword or "").strip() or None,
        "last_profile_scraped_at": utcnow_iso(),
    }
    resp = sb_upsert("sns_accounts", [row], on_conflict="platform,account_name", select="id")
    return int(resp[0]["id"])

def upsert_accounts_metrics(account_id: int, followers: int, maximum_likes: Optional[int], posts: Optional[int]) -> None:
    sb_upsert("accounts_metrics", [{
        "account_id": account_id,
        "metric_date": today_iso(),
        "followers": int(followers or 0),
        "following": 0,
        "maximum_likes": maximum_likes,
        "posts": int(posts or 0),
        "created_at": utcnow_iso(),
    }], on_conflict="account_id,metric_date", select="id")

def upsert_full_sns_account_youtube(account_id: int, channel: Dict[str, Any], keyword: str) -> None:
    existing = sb_get("sns_accounts", {"select": "id,keywords", "id": f"eq.{account_id}", "limit": "1"})
    existing_keywords = existing[0].get("keywords") if existing else None
    merged = merge_keywords(existing_keywords, keyword)

    clean_profile_url = normalize_profile_image_url(channel.get("profile_image_url"))
    stored_image_url = upload_profile_image(clean_profile_url, channel.get("account_name") or str(account_id))
    final_profile_url = stored_image_url or clean_profile_url or DEFAULT_PROFILE_IMAGE_URL

    row = {
        "id": account_id,
        "platform": "youtube",
        "account_name": channel.get("account_name"),
        "account_url": channel.get("account_url"),
        "caption": channel.get("caption") or channel.get("display_name"),
        "is_verified": channel.get("is_verified"),
        "language": "ja",
        "country": "JP",
        "keywords": merged,
        "profile_image_url": final_profile_url,
        "last_profile_scraped_at": utcnow_iso(),
    }
    sb_upsert("sns_accounts", [row], on_conflict="id", select="id")

def upsert_posts_and_metrics(account_id: int, items_raw: List[Dict[str, Any]]) -> None:
    parsed = [p for p in (parse_video_from_item(x) for x in items_raw) if p]
    if not parsed:
        return

    post_rows = [{
        "account_id": account_id,
        "external_post_id": p["external_post_id"],
        "content_text": p["content_text"],
        "caption": p["caption"],
        "link": p.get("link"),
        "posted_at": p.get("posted_at"),
        "scraped_at": p.get("scraped_at"),
        "media_type": "video",
        "campaign_id": None,
        "collaboration_id": None,
    } for p in parsed]

    # Keep your existing posts upsert behavior
    upserted = sb_upsert("posts", post_rows, on_conflict="external_post_id", select="id,external_post_id")
    post_id_by_ext = {r["external_post_id"]: int(r["id"]) for r in upserted}

    # Build snapshot rows for post_metric_snapshots
    snapshot_rows: List[Dict[str, Any]] = []
    captured_at = utcnow_iso()

    for p in parsed:
        post_id = post_id_by_ext.get(p["external_post_id"])
        if not post_id:
            continue

        m = p["metrics"]
        views = to_int(m.get("views")) or 0
        likes = to_int(m.get("likes")) or 0
        comments_count = to_int(m.get("comments_count")) or 0

        row: Dict[str, Any] = {"post_id": post_id}

        # Snapshot timestamps
        if "captured_at" in POST_METRIC_SNAPSHOTS_COLUMNS:
            row["captured_at"] = captured_at
        if "created_at" in POST_METRIC_SNAPSHOTS_COLUMNS:
            row["created_at"] = captured_at

        if "views" in POST_METRIC_SNAPSHOTS_COLUMNS:
            row["views"] = views
        if "likes" in POST_METRIC_SNAPSHOTS_COLUMNS:
            row["likes"] = likes
        if "comments_count" in POST_METRIC_SNAPSHOTS_COLUMNS:
            row["comments_count"] = comments_count
        if "duration_seconds" in POST_METRIC_SNAPSHOTS_COLUMNS:
            row["duration_seconds"] = None

        # Optional computed rates (store as decimals 0..1)
        if "like_view_rate" in POST_METRIC_SNAPSHOTS_COLUMNS:
            row["like_view_rate"] = (likes / views) if views > 0 else 0.0
        if "comment_view_rate" in POST_METRIC_SNAPSHOTS_COLUMNS:
            row["comment_view_rate"] = (comments_count / views) if views > 0 else 0.0

        snapshot_rows.append(row)

    # Insert snapshots (time-series): do NOT upsert unless you enforce a unique constraint
    if snapshot_rows:
        sb_upsert("post_metric_snapshots", snapshot_rows, on_conflict=None, select="id")

def mark_posts_scraped(account_id: int) -> None:
    sb_patch("sns_accounts", {"id": f"eq.{account_id}"}, {"last_posts_scraped_at": utcnow_iso()})

def should_scrape_posts_now(row: Dict[str, Any]) -> bool:
    last = iso_to_dt(row.get("last_posts_scraped_at"))
    if not last:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(hours=YT_POSTS_REFRESH_HOURS)
    return last < cutoff

# -----------------------
# DB gating for discovery
# -----------------------
def db_candidates_for_keyword(keyword: str) -> List[Dict[str, Any]]:
    return sb_get("sns_accounts", {
        "select": "id,platform,account_name,keywords,last_profile_scraped_at",
        "platform": "eq.youtube",
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

def db_youtube_accounts_for_monitoring(limit: int) -> List[Dict[str, Any]]:
    return sb_get("sns_accounts", {
        "select": "id,platform,account_name,account_url,last_posts_scraped_at",
        "platform": "eq.youtube",
        "limit": str(limit),
        "order": "id.desc",
    })

# -----------------------
# Modes
# -----------------------
def run_discovery() -> None:
    keywords = pick_keywords_for_run(KEYWORD_POOL, YT_KEYWORDS_PER_RUN)
    print("MODE=discovery | keywords:", keywords)

    for kw in keywords:
        candidates = db_candidates_for_keyword(kw)
        need = (len(candidates) < MIN_DB_CANDIDATES_PER_KEYWORD) or keyword_pool_is_stale(candidates)
        print(f"\n=== keyword: {kw} === | DB candidates={len(candidates)} | need_discovery={need}")
        if not need:
            continue

        payload = {
            "searchQueries": [kw],
            "maxResults": YT_MAX_RESULTS,
            "maxResultsShorts": YT_MAX_SHORTS,
            "maxResultStreams": YT_MAX_STREAMS,
            "sortingOrder": YT_SORTING_ORDER,
        }
        if YT_DATE_FILTER:
            payload["dateFilter"] = YT_DATE_FILTER

        items = apify_run_youtube(payload)
        print("Items returned:", len(items))

        channels: Dict[str, Dict[str, Any]] = {}
        for it in items:
            ch = parse_channel_from_item(it)
            if not ch:
                continue
            subs = int(ch.get("followers") or 0)
            if subs < MIN_FOLLOWERS:
                continue
            if not influencer_filter(ch):
                continue
            channels[ch["account_name"]] = ch

        print("Channels kept:", len(channels))

        for key, ch in channels.items():
            if not ch.get("account_url"):
                continue
            account_id = ensure_minimal_account_row(ch["account_name"], ch["account_url"], kw)
            upsert_accounts_metrics(account_id, ch["followers"], ch.get("maximum_likes"), ch.get("posts"))
            time.sleep(0.1)

    print("\nDiscovery done.")

def run_monitoring() -> None:
    print("MODE=monitoring")
    rows = db_youtube_accounts_for_monitoring(limit=800)

    due: List[Dict[str, Any]] = []
    for r in rows:
        if not r.get("account_url"):
            continue
        if not should_scrape_posts_now(r):
            continue
        account_id = int(r["id"])
        if not is_trending_db_only(account_id):
            continue
        due.append(r)

    due = due[:YT_MAX_CHANNELS_PER_RUN]
    print("Trending & due channels:", len(due))

    for acc in due:
        account_id = int(acc["id"])
        channel_url = acc.get("account_url")
        print("Scraping channel:", channel_url, "id=", account_id)

        # channel timeline scrape
        channel_items = apify_run_youtube({
            "startUrls": [{"url": channel_url}],
            "maxResults": YT_TRENDING_CHANNEL_MAX_RESULTS,
            "maxResultsShorts": 0,
            "maxResultStreams": 0,
            "sortingOrder": "date",
        })

        # refresh channel metadata from any returned item (best-effort)
        if channel_items:
            ch = parse_channel_from_item(channel_items[0])
            if ch:
                upsert_full_sns_account_youtube(account_id, ch, keyword="")
                upsert_accounts_metrics(account_id, ch["followers"], ch.get("maximum_likes"), ch.get("posts"))

        upsert_posts_and_metrics(account_id, channel_items)
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
