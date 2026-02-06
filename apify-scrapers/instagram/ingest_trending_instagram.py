import os
import re
import json
import random
import time
import requests
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

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


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def iso_to_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def today_iso() -> str:
    return date.today().isoformat()


def norm_text(s: Optional[str]) -> str:
    return (s or "").strip().lower()


# -----------------------
# Config
# -----------------------
APIFY_TOKEN = must_env("APIFY_TOKEN")
SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")
PROFILE_IMAGE_BUCKET = os.getenv("PROFILE_IMAGE_BUCKET", "profile_images").strip() or "profile_images"

KEYWORD_POOL = [
    "グルメ",
    "コスメ",
    # write more keywords here
]
KEYWORDS_PER_RUN = env_int("KEYWORDS_PER_RUN", 5)
CYCLE_STATE_PATH = os.path.join(os.path.dirname(__file__), ".keyword_cycle.json")

JP_STRICT = env_bool("JP_STRICT", True)

# Apify call sizes
SEARCH_LIMIT = env_int("SEARCH_LIMIT", 50)
POSTS_LIMIT = env_int("POSTS_LIMIT", 50)

# Discovery scheduling / gating
MIN_DB_CANDIDATES_PER_KEYWORD = env_int("MIN_DB_CANDIDATES_PER_KEYWORD", 50)
DISCOVERY_STALE_DAYS = env_int("DISCOVERY_STALE_DAYS", 7)
MAX_DB_CANDIDATES_FETCH = env_int("MAX_DB_CANDIDATES_FETCH", 300)

# Posts scraping scheduling
POSTS_REFRESH_HOURS = env_int("POSTS_REFRESH_HOURS", 12)

# Trending thresholds
HIGH_FOLLOWERS_THRESHOLD = env_int("HIGH_FOLLOWERS_THRESHOLD", 100_000)
MIN_DAILY_GROWTH_PCT = env_float("MIN_DAILY_GROWTH_PCT", 0.5)
MIN_DAILY_GROWTH_ABS = env_int("MIN_DAILY_GROWTH_ABS", 500)
TREND_DAYS = env_int("TREND_DAYS", 3)

# Influencer-only filter
INFLUENCER_STRICT = env_bool("INFLUENCER_STRICT", False)

# ✅ MIN FOLLOWERS GATE (only save >= this)
MIN_FOLLOWERS = env_int("MIN_FOLLOWERS", 10_000)

HASHTAG_RE = re.compile(r"#([\w\d_]+)", re.UNICODE)

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


# -----------------------
# Heuristics
# -----------------------
def looks_like_company(profile: Dict[str, Any]) -> bool:
    username = norm_text(profile.get("username"))
    full_name = norm_text(profile.get("full_name"))
    bio = norm_text(profile.get("biography"))

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
    bio = norm_text(profile.get("biography"))
    full_name = norm_text(profile.get("full_name"))

    for kw in PERSON_HINT_KEYWORDS:
        if kw in bio:
            return True

    if len(full_name.split()) >= 2 and all(len(x) >= 2 for x in full_name.split()[:2]):
        return True

    return False


JP_CHAR_RE = re.compile(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]")


def is_japanese_influencer(profile: Dict[str, Any]) -> bool:
    full_name = profile.get("full_name") or ""
    bio = profile.get("biography") or ""
    return (JP_CHAR_RE.search(full_name) is not None) or (JP_CHAR_RE.search(bio) is not None)


def influencer_filter(profile: Dict[str, Any]) -> bool:
    if JP_STRICT and not is_japanese_influencer(profile):
        return False

    # ✅ follower gate
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
# Clients
# -----------------------
def apify_run_instagram_scraper(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items"
    r = requests.post(url, params={"token": APIFY_TOKEN}, json=payload, timeout=300)
    if not r.ok:
        raise RuntimeError(f"Apify error {r.status_code}: {r.text[:800]}")
    data = r.json()
    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected Apify response: {str(data)[:800]}")
    return data


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
# Keyword cycle
# -----------------------
def load_keyword_cycle(pool: List[str]) -> List[str]:
    try:
        with open(CYCLE_STATE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
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
        raise RuntimeError("KEYWORD_POOL is empty. Add keywords to rotate through.")
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
# Parsing Apify outputs
# -----------------------
def first(it: Dict[str, Any], *keys: str) -> Any:
    for k in keys:
        v = it.get(k)
        if v is None:
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        return v
    return None


def parse_profile(it: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    username = first(it, "username", "userName", "handle")
    if not username:
        return None

    platform_user_id = first(it, "id", "userId", "platformUserId") or username

    followers = int(first(it, "followersCount", "followers") or 0)
    following = int(first(it, "followsCount", "following") or 0)
    posts_count = int(first(it, "postsCount", "posts") or 0)

    return {
        "platform_user_id": str(platform_user_id),
        "username": str(username),
        "full_name": first(it, "fullName", "name"),
        "biography": first(it, "biography", "bio", "description"),
        "external_url": first(it, "externalUrl", "website"),
        "profile_pic_url": first(it, "profilePicUrl", "profilePicUrlHd", "profilePicture"),
        "is_verified": first(it, "isVerified", "verified"),
        "is_business": first(it, "isBusinessAccount", "businessAccount", "isBusiness"),
        "followers": followers,
        "following": following,
        "posts_count": posts_count,
        "account_url": f"https://www.instagram.com/{username}/",
    }


def parse_post(it: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    ext_id = first(it, "id", "postId", "shortCode", "code")
    if not ext_id:
        return None

    caption = first(it, "caption", "text")
    link = first(it, "url", "postUrl", "link")

    ts = first(it, "timestamp", "takenAt", "createdAt")
    posted_at = None
    if ts is not None:
        try:
            if isinstance(ts, (int, float)) or (isinstance(ts, str) and str(ts).isdigit()):
                epoch = int(ts)
                dt = datetime.fromtimestamp(epoch if epoch < 10_000_000_000 else epoch / 1000, tz=timezone.utc)
                posted_at = dt.isoformat()
            else:
                posted_at = datetime.fromisoformat(str(ts).replace("Z", "+00:00")).isoformat()
        except Exception:
            posted_at = None

    return {
        "external_post_id": str(ext_id),
        "link": link,
        "caption": caption,
        "posted_at": posted_at,
        "media_type": first(it, "type", "mediaType"),
        "likes": first(it, "likesCount", "likes"),
        "comments": first(it, "commentsCount", "comments"),
        "views": first(it, "videoViewCount", "views", "playCount"),
    }


def extract_hashtags(text: str) -> Set[str]:
    return {m.group(1).lower() for m in HASHTAG_RE.finditer(text or "") if m.group(1)}


# -----------------------
# Discovery / DB gating
# -----------------------
def db_candidates_for_keyword(keyword: str) -> List[Dict[str, Any]]:
    return sb_get("sns_accounts", {
        "select": "id,platform,platform_user_id,platform_profile_id,account_name,account_url,keywords,last_profile_scraped_at,last_posts_scraped_at,is_verified,business_account,caption",
        "platform": "eq.instagram",
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


def apify_discover_profiles_for_keyword(keyword: str) -> List[Dict[str, Any]]:
    payload = {
        "search": keyword,
        "searchType": "user",
        "searchLimit": SEARCH_LIMIT,
        "resultsType": "details",
    }
    items = apify_run_instagram_scraper(payload)

    profiles: List[Dict[str, Any]] = []
    for it in items:
        p = parse_profile(it)
        if not p:
            continue
        if influencer_filter(p):
            profiles.append(p)

    print("Kept profiles after filter:", len(profiles))
    return profiles


def merge_keywords(existing: Optional[str], new_kw: str) -> str:
    new_kw = new_kw.strip()
    if not existing:
        return new_kw
    parts = [p.strip() for p in existing.split(",") if p.strip()]
    lower = {p.lower() for p in parts}
    if new_kw.lower() not in lower:
        parts.append(new_kw)
    return ", ".join(parts)


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
        object_path = f"instagram/{platform_user_id}{ext}"
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


# ✅ CHANGED: returns Optional[int] and refuses < MIN_FOLLOWERS
def upsert_account_from_profile(profile: Dict[str, Any], keyword: str) -> Optional[int]:
    # ✅ HARD follower gate (DB safety net)
    if int(profile.get("followers") or 0) < MIN_FOLLOWERS:
        return None

    existing = sb_get("sns_accounts", {
        "select": "id,keywords",
        "platform": "eq.instagram",
        "platform_user_id": f"eq.{profile['platform_user_id']}",
        "limit": "1",
    })
    existing_keywords = existing[0].get("keywords") if existing else None
    merged = merge_keywords(existing_keywords, keyword)

    stored_image_url = upload_profile_image(
        profile.get("profile_pic_url"),
        str(profile["platform_user_id"]),
    )

    rows = [{
        "platform": "instagram",
        "platform_user_id": profile["platform_user_id"],
        "platform_profile_id": profile["username"],
        "account_name": profile["username"],
        "account_url": profile["account_url"],
        "caption": profile.get("biography"),
        "profile_image_url": stored_image_url or profile.get("profile_pic_url"),
        "is_verified": profile.get("is_verified"),
        "business_account": profile.get("is_business"),
        "country": "JP",
        "language": "ja",
        "keyword": keyword,
        "keywords": merged,
        "last_profile_scraped_at": utcnow_iso(),
    }]

    resp = sb_upsert("sns_accounts", rows, on_conflict="platform,platform_user_id", select="id,keywords")
    if not resp:
        raise RuntimeError("Upsert sns_accounts returned empty response.")
    return int(resp[0]["id"])


def upsert_account_metrics(account_id: int, profile: Dict[str, Any]) -> None:
    rows = [{
        "account_id": account_id,
        "metric_date": today_iso(),
        "followers": int(profile.get("followers") or 0),
        "following": int(profile.get("following") or 0),
        "posts": int(profile.get("posts_count") or 0),
    }]
    sb_upsert("accounts_metrics", rows, on_conflict="account_id,metric_date", select="id")


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
# Posts scraping
# -----------------------
def should_scrape_posts_now(sns_account_row: Dict[str, Any]) -> bool:
    last = iso_to_dt(sns_account_row.get("last_posts_scraped_at"))
    if not last:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(hours=POSTS_REFRESH_HOURS)
    return last < cutoff


def apify_scrape_posts(profile_url: str) -> List[Dict[str, Any]]:
    payload = {
        "directUrls": [profile_url],
        "resultsType": "posts",
        "resultsLimit": POSTS_LIMIT,
        "addParentData": True,
    }
    items = apify_run_instagram_scraper(payload)
    posts: List[Dict[str, Any]] = []
    for it in items:
        p = parse_post(it)
        if p:
            posts.append(p)
    return posts


def ingest_posts_and_metrics(account_id: int, posts: List[Dict[str, Any]]) -> None:
    if not posts:
        return

    post_rows: List[Dict[str, Any]] = []
    for p in posts:
        post_rows.append({
            "account_id": account_id,
            "external_post_id": p["external_post_id"],
            "link": p.get("link"),
            "caption": p.get("caption"),
            "posted_at": p.get("posted_at"),
            "scraped_at": utcnow_iso(),
            "media_type": p.get("media_type"),
        })

    upserted = sb_upsert("posts", post_rows, on_conflict="external_post_id", select="id,external_post_id,caption")
    post_id_by_ext = {r["external_post_id"]: int(r["id"]) for r in upserted}

    metric_rows: List[Dict[str, Any]] = []
    for p in posts:
        post_id = post_id_by_ext.get(p["external_post_id"])
        if not post_id:
            continue

        metric_rows.append({
            "post_id": post_id,
            "likes": p.get("likes"),
            "comments": p.get("comments"),
            "views": p.get("views"),
            "created_at": utcnow_iso(),
        })

        caption = p.get("caption") or ""
        tags = extract_hashtags(caption)
        if tags:
            upsert_hashtags_and_join(post_id, tags)

    if metric_rows:
        sb_upsert("post_metrics", metric_rows, on_conflict=None, select="id")


def upsert_hashtags_and_join(post_id: int, tags: Set[str]) -> None:
    hashtag_rows = [{"tag": t} for t in tags]
    upserted = sb_upsert("hashtags", hashtag_rows, on_conflict="tag", select="id,tag")
    tag_to_id = {r["tag"]: int(r["id"]) for r in upserted}

    join_rows = []
    for t in tags:
        hid = tag_to_id.get(t)
        if hid:
            join_rows.append({"post_id": post_id, "hashtag_id": hid})

    if join_rows:
        sb_upsert("post_hashtag", join_rows, on_conflict="post_id,hashtag_id", select="id")


def mark_posts_scraped(account_id: int) -> None:
    sb_patch(
        "sns_accounts",
        where_params={"id": f"eq.{account_id}"},
        fields={"last_posts_scraped_at": utcnow_iso()},
    )


# -----------------------
# Main
# -----------------------
def main() -> None:
    keywords = pick_keywords_for_run(KEYWORD_POOL, KEYWORDS_PER_RUN)
    print("KEYWORDS:", keywords)
    print("Discovery gating:",
          f"MIN_DB_CANDIDATES_PER_KEYWORD={MIN_DB_CANDIDATES_PER_KEYWORD}, DISCOVERY_STALE_DAYS={DISCOVERY_STALE_DAYS}")
    print("Posts gating:", f"POSTS_REFRESH_HOURS={POSTS_REFRESH_HOURS}")
    print("Trending:", f"HIGH_FOLLOWERS_THRESHOLD={HIGH_FOLLOWERS_THRESHOLD}, TREND_DAYS={TREND_DAYS}, "
                     f"MIN_DAILY_GROWTH_ABS={MIN_DAILY_GROWTH_ABS}, MIN_DAILY_GROWTH_PCT={MIN_DAILY_GROWTH_PCT}")
    print("Influencer-only:", f"INFLUENCER_STRICT={INFLUENCER_STRICT}, MIN_FOLLOWERS={MIN_FOLLOWERS}")

    for kw in keywords:
        print(f"\n=== keyword: {kw} ===")

        candidates = db_candidates_for_keyword(kw)
        print(f"DB candidates found: {len(candidates)}")

        need_discovery = (len(candidates) < MIN_DB_CANDIDATES_PER_KEYWORD) or keyword_pool_is_stale(candidates)

        if need_discovery:
            print("Discovery needed -> calling Apify search (influencer-only filter applied).")
            profiles = apify_discover_profiles_for_keyword(kw)
            print(f"Apify discovered profiles: {len(profiles)}")

            for prof in profiles:
                # ✅ CHANGED: account_id can be None now
                account_id = upsert_account_from_profile(prof, kw)
                if not account_id:
                    continue
                upsert_account_metrics(account_id, prof)
                time.sleep(0.2)
        else:
            print("Discovery skipped (DB pool sufficient and not stale).")

        candidates = db_candidates_for_keyword(kw)

        trending_accounts: List[Dict[str, Any]] = []
        for acc in candidates:
            account_id = int(acc["id"])
            if is_trending_db_only(account_id):
                trending_accounts.append(acc)

        print(f"Trending accounts (DB-only): {len(trending_accounts)}")

        for acc in trending_accounts:
            account_id = int(acc["id"])
            account_url = acc.get("account_url")
            if not account_url:
                continue

            if not should_scrape_posts_now(acc):
                continue

            print(f"Scraping posts for trending @{acc.get('account_name')} (id={account_id})")
            posts = apify_scrape_posts(account_url)
            ingest_posts_and_metrics(account_id, posts)
            mark_posts_scraped(account_id)

            time.sleep(0.5)

    print("\nDone.")


if __name__ == "__main__":
    main()
