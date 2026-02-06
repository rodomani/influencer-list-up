import os
import re
import json
import random
import time
import requests
from datetime import date, datetime, timezone
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
APIFY_TOKEN = must_env("APIFY_TOKEN")
SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")
PROFILE_IMAGE_BUCKET = os.getenv("PROFILE_IMAGE_BUCKET", "profile_images").strip() or "profile_images"

DEFAULT_PROFILE_IMAGE_URL = os.getenv(
    "DEFAULT_PROFILE_IMAGE_URL",
    "https://www.tiktok.com/favicon.ico",
)

# TikTok keywords
TIKTOK_KEYWORD_POOL = [
    "グルメ",
    "コスメ",
]

TIKTOK_KEYWORDS_PER_RUN = env_int("TIKTOK_KEYWORDS_PER_RUN", 5)
TIKTOK_MAX_ITEMS = env_int("TIKTOK_MAX_ITEMS", 120)

# Keep for metadata/logging, but NOT sent to actor (schema mismatch)
TIKTOK_SORT = env_str("TIKTOK_SORT", "relevance")
TIKTOK_LANGUAGE = env_str("TIKTOK_LANGUAGE", "ja")

# Proxy (recommended)
TIKTOK_PROXY_COUNTRY = env_str("TIKTOK_PROXY_COUNTRY", "JP")

# ✅ NEW: Minimum follower gate (only save accounts >= 10,000)
MIN_FOLLOWERS = env_int("MIN_FOLLOWERS", 10_000)

JP_STRICT = env_bool("JP_STRICT", True)
INFLUENCER_STRICT = env_bool("INFLUENCER_STRICT", False)

# Trending thresholds
HIGH_FOLLOWERS_THRESHOLD = env_int("HIGH_FOLLOWERS_THRESHOLD", 100_000)
MIN_DAILY_GROWTH_PCT = env_float("MIN_DAILY_GROWTH_PCT", 0.5)
MIN_DAILY_GROWTH_ABS = env_int("MIN_DAILY_GROWTH_ABS", 500)
TREND_DAYS = env_int("TREND_DAYS", 3)

CYCLE_STATE_PATH = os.path.join(os.path.dirname(__file__), ".keyword_cycle_tiktok.json")

# Influencer-only filter
COMPANY_BIO_KEYWORDS = {
    "official", "brand", "shop", "store", "customer service", "support", "press",
    "pr", "sales", "shipping", "worldwide shipping", "order", "orders", "buy",
    "discount", "promo", "promotion", "wholesale", "stockist",
    "headquarters", "hq", "contact us", "email us", "business inquiries",
    "corp", "corporation", "company", "inc", "ltd", "llc", "co.", "gmbh", "plc", "news"
}

COMPANY_NAME_TOKENS = {
    "inc", "ltd", "llc", "corp", "co", "company", "group", "official", "shop", "store",
    "studio", "agency", "brand", "boutique", "restaurant", "hotel", "clinic", "news"
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

    for tok in COMPANY_NAME_TOKENS:
        if f" {tok} " in f" {full_name} " or f" {tok} " in f" {username} ":
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

def supabase_table_columns(table: str) -> Set[str]:
    try:
        rows = sb_get(table, {"select": "*", "limit": "1"})
        if rows:
            return set(rows[0].keys())
    except Exception:
        pass
    return {"post_id", "likes", "comments", "views", "created_at"}

POST_METRICS_COLUMNS = supabase_table_columns("post_metrics")

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
# Apify: clockworks/tiktok-scraper (run->poll->fetch + logs)
# -----------------------
def apify_run_tiktok(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    run_url = "https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs"
    r = requests.post(run_url, params={"token": APIFY_TOKEN}, json=payload, timeout=60)
    if not r.ok:
        raise RuntimeError(f"Apify run start error {r.status_code}: {r.text[:800]}")

    run = r.json().get("data") or {}
    run_id = run.get("id")
    if not run_id:
        raise RuntimeError(f"Apify run start returned no run id: {r.text[:800]}")

    status_url = f"https://api.apify.com/v2/actor-runs/{run_id}"
    for _ in range(120):  # 10 minutes max
        s = requests.get(status_url, params={"token": APIFY_TOKEN}, timeout=30)
        s.raise_for_status()
        data = s.json().get("data") or {}
        status = data.get("status")

        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            if status != "SUCCEEDED":
                log_url = f"https://api.apify.com/v2/actor-runs/{run_id}/log"
                log = requests.get(log_url, params={"token": APIFY_TOKEN}, timeout=30)
                raise RuntimeError(
                    f"Apify run {status} (runId={run_id}). Log tail:\n{log.text[-4000:]}"
                )

            dataset_id = data.get("defaultDatasetId")
            if not dataset_id:
                raise RuntimeError(f"Apify run SUCCEEDED but no dataset id (runId={run_id}).")

            items_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items"
            items = requests.get(items_url, params={"token": APIFY_TOKEN, "clean": "true"}, timeout=60)
            items.raise_for_status()
            out = items.json()
            return out if isinstance(out, list) else []

        time.sleep(5)

    raise RuntimeError(f"Apify run did not finish in time (runId={run_id}).")

# -----------------------
# Parsing
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

    followers = to_int(first(author, "fans", "followers", "followerCount", "fansCount"))
    following = to_int(first(author, "following", "followingCount"))
    bio = first(author, "signature", "bio", "description")

    avatar = first(author, "avatar", "avatarThumb", "avatarMedium", "avatarLarger", "profileImageUrl")
    profile_image_url = str(avatar).strip() if avatar else DEFAULT_PROFILE_IMAGE_URL

    verified = first(author, "verified", "isVerified")

    return {
        "account_name": username,
        "account_url": f"https://www.tiktok.com/@{username}",
        "caption": bio,
        "profile_image_url": profile_image_url,
        "is_verified": bool(verified) if verified is not None else None,
        "followers": int(followers or 0),
        "following": int(following or 0),
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
    """
    ✅ CHANGED: If followers < MIN_FOLLOWERS, do NOT save this account at all.
    """
    if followers < MIN_FOLLOWERS:
        return None

    resp = sb_upsert(
        "sns_accounts",
        [{
            "platform": platform,
            "account_name": account_name,
            "account_url": account_url,
            "profile_image_url": DEFAULT_PROFILE_IMAGE_URL,
        }],
        on_conflict="platform,account_name",
        select="id",
    )
    return int(resp[0]["id"])

def upsert_accounts_metrics(account_id: int, followers: int, following: int) -> None:
    sb_upsert(
        "accounts_metrics",
        [{
            "account_id": account_id,
            "metric_date": today_iso(),
            "followers": followers,
            "following": following,
            "created_at": utcnow_iso(),
        }],
        on_conflict="account_id,metric_date",
        select="id",
    )

def upsert_full_sns_account_tiktok(account_id: int, author: Dict[str, Any], keyword: str) -> None:
    existing = sb_get("sns_accounts", {"select": "id,keywords", "id": f"eq.{account_id}", "limit": "1"})
    existing_keywords = existing[0].get("keywords") if existing else None
    merged = merge_keywords(existing_keywords, keyword)

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
        "business_account": None,
        "does_livestream": None,
        "keywords": merged,
    }

    sb_upsert("sns_accounts", [row], on_conflict="id", select="id")

def upsert_posts_and_metrics(account_id: int, posts_raw: List[Dict[str, Any]]) -> None:
    parsed = [p for p in (parse_post_from_item(x) for x in posts_raw) if p]
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
        "campaign_id": None,
        "collaboration_id": None,
        "external_post_id": p["external_post_id"],
    } for p in parsed]

    upserted_posts = sb_upsert(
        "posts",
        post_rows,
        on_conflict="external_post_id",
        select="id,external_post_id",
    )
    post_id_by_ext = {r["external_post_id"]: int(r["id"]) for r in upserted_posts}

    metric_rows: List[Dict[str, Any]] = []
    for p in parsed:
        post_id = post_id_by_ext.get(p["external_post_id"])
        if not post_id:
            continue

        row: Dict[str, Any] = {"post_id": post_id, "created_at": utcnow_iso()}

        m = p["metrics"]
        if "likes" in POST_METRICS_COLUMNS:
            row["likes"] = m.get("likes")
        if "comments" in POST_METRICS_COLUMNS:
            row["comments"] = m.get("comments")
        if "views" in POST_METRICS_COLUMNS:
            row["views"] = m.get("views")
        if "shares" in POST_METRICS_COLUMNS:
            row["shares"] = m.get("shares")

        metric_rows.append(row)

    if metric_rows:
        sb_upsert("post_metrics", metric_rows, on_conflict=None, select="id")

# -----------------------
# Main
# -----------------------
def main() -> None:
    keywords = pick_keywords_for_run(TIKTOK_KEYWORD_POOL, TIKTOK_KEYWORDS_PER_RUN)
    print("TIKTOK KEYWORDS:", keywords)
    print("Settings:", {
        "maxItems": TIKTOK_MAX_ITEMS,
        "proxyCountry": TIKTOK_PROXY_COUNTRY,
        "minFollowers": MIN_FOLLOWERS,
        "note": "sort/language not sent to actor; kept for DB metadata",
    })

    for kw in keywords:
        print(f"\n=== keyword: {kw} ===")

        # ✅ CHANGED: payload uses the actor's real schema fields
        payload = {
            "searchQueries": [kw],
            "searchSection": "/video",
            "resultsPerPage": min(100, TIKTOK_MAX_ITEMS),
            "proxyCountry": TIKTOK_PROXY_COUNTRY,
        }

        items = apify_run_tiktok(payload)
        print("Items returned:", len(items))

        authors: Dict[str, Dict[str, Any]] = {}
        posts_by_author: Dict[str, List[Dict[str, Any]]] = {}

        for it in items:
            a = parse_author_from_item(it)
            p = parse_post_from_item(it)
            if not a or not p:
                continue

            # ✅ NEW: early follower gate (avoid any DB work)
            if int(a.get("followers") or 0) < MIN_FOLLOWERS:
                continue
            if not influencer_filter(a):
                continue

            uname = a["account_name"]
            authors[uname] = a
            posts_by_author.setdefault(uname, []).append(it)

        author_id_map: Dict[str, int] = {}

        # Phase 1: write metrics for everyone passing MIN_FOLLOWERS
        for uname, a in authors.items():
            account_id = ensure_minimal_account_row("tiktok", uname, a["account_url"], int(a.get("followers") or 0))
            if not account_id:
                continue

            author_id_map[uname] = account_id
            upsert_accounts_metrics(account_id, a["followers"], a["following"])

        # Phase 2: trending-only persistence (posts + fuller metadata)
        trending_count = 0
        for uname, account_id in author_id_map.items():
            if not is_trending_db_only(account_id):
                continue

            trending_count += 1
            a = authors[uname]
            print("TRENDING:", uname, "followers=", a.get("followers"))

            upsert_full_sns_account_tiktok(account_id, a, kw)
            upsert_posts_and_metrics(account_id, posts_by_author.get(uname, []))
            time.sleep(0.2)

        print(f"Trending accounts for '{kw}': {trending_count}")

    print("\nDone.")

if __name__ == "__main__":
    main()
