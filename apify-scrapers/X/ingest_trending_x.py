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
APIFY_TOKEN = must_env("APIFY_TOKEN")
SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")
PROFILE_IMAGE_BUCKET = os.getenv("PROFILE_IMAGE_BUCKET", "profile_images").strip() or "profile_images"

DEFAULT_PROFILE_IMAGE_URL = os.getenv(
    "DEFAULT_PROFILE_IMAGE_URL",
    "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
)

KEYWORD_POOL = ["グルメ", "コスメ"]
X_KEYWORDS_PER_RUN = env_int("X_KEYWORDS_PER_RUN", 5)
X_MAX_ITEMS = env_int("X_MAX_ITEMS", 300)
X_TWEET_LANGUAGE = env_str("X_TWEET_LANGUAGE", "ja")
X_SORT = env_str("X_SORT", "Latest")

MIN_FOLLOWERS = env_int("MIN_FOLLOWERS", 10_000)
X_MAX_TWEETS_PER_AUTHOR = env_int("X_MAX_TWEETS_PER_AUTHOR", 50)

JP_STRICT = env_bool("JP_STRICT", True)
INFLUENCER_STRICT = env_bool("INFLUENCER_STRICT", False)

HIGH_FOLLOWERS_THRESHOLD = env_int("HIGH_FOLLOWERS_THRESHOLD", 100_000)
MIN_DAILY_GROWTH_PCT = env_float("MIN_DAILY_GROWTH_PCT", 0.5)
MIN_DAILY_GROWTH_ABS = env_int("MIN_DAILY_GROWTH_ABS", 500)
TREND_DAYS = env_int("TREND_DAYS", 3)

CYCLE_STATE_PATH = os.path.join(os.path.dirname(__file__), ".keyword_cycle_x.json")

COMPANY_BIO_KEYWORDS = {
    "official", "brand", "shop", "store", "customer service", "support", "press",
    "pr", "sales", "shipping", "worldwide shipping", "order", "orders", "buy",
    "discount", "promo", "promotion", "wholesale", "stockist",
    "headquarters", "hq", "contact us", "email us", "business inquiries",
    "corp", "corporation", "company", "inc", "ltd", "llc", "co.", "gmbh", "plc", "news"
}

COMPANY_NAME_TOKENS = {
    "inc", "ltd", "llc", "corp", "co", "company", "group", "official", "shop", "store",
    "studio", "agency", "brand", "boutique", "restaurant", "hotel", "clinic", "news", "show"
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

def supabase_table_columns(table: str) -> Set[str]:
    """
    Best-effort: infer columns from a sample row. If table is empty, fall back to known sets.
    """
    try:
        rows = sb_get(table, {"select": "*", "limit": "1"})
        if rows:
            return set(rows[0].keys())
    except Exception:
        pass

    if table == "post_metrics":
        return {"post_id", "likes", "comments", "views", "created_at"}
    if table == "posts":
        return {"id", "account_id", "external_post_id", "content_text", "caption", "link", "posted_at", "scraped_at"}
    if table == "sns_accounts":
        return {"id", "platform", "account_name", "account_url", "caption", "profile_image_url", "is_verified", "language", "country"}
    if table == "accounts_metrics":
        return {"account_id", "metric_date", "followers", "following", "created_at"}
    return set()

POSTS_COLUMNS = supabase_table_columns("posts")
POST_METRICS_COLUMNS = supabase_table_columns("post_metrics")
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
            print(f"Image download failed {resp.status_code}: {image_url}")
            return None

        content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if not content_type.startswith("image/"):
            print(f"Not an image (Content-Type={content_type}): {image_url}")
            return None

        ext = infer_image_ext(content_type, image_url)
        object_path = f"x/{platform_user_id}{ext}"
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
# Apify
# -----------------------
def apify_run(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = "https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items"
    r = requests.post(url, params={"token": APIFY_TOKEN}, json=payload, timeout=300)
    if not r.ok:
        raise RuntimeError(f"Apify error {r.status_code}: {r.text[:800]}")
    data = r.json()
    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected Apify response: {str(data)[:800]}")
    return data

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
        "posts": int(first(a, "mediaCount", "statusesCount", "posts"), 0)
    }

def parse_tweet(raw_tweet: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    tid = first(raw_tweet, "id", "tweetId", "restId")
    if not tid:
        return None

    created_at = first(raw_tweet, "createdAt", "created_at", "time")
    posted_at = None
    if created_at:
        try:
            posted_at = datetime.fromisoformat(str(created_at).replace("Z", "+00:00")).isoformat()
        except Exception:
            posted_at = None

    return {
        "external_post_id": str(tid),
        "content_text": first(raw_tweet, "text", "fullText", "content") or "",
        "caption": first(raw_tweet, "text", "fullText", "content") or "",
        "link": first(raw_tweet, "url", "twitterUrl", "tweetUrl"),
        "posted_at": first(raw_tweet, "createdAt"),
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
def ensure_minimal_account_row(account_name: str, followers: int, profile_image_url: Optional[str]) -> Optional[int]:
    if followers < MIN_FOLLOWERS:
        return None

    # must satisfy NOT NULL
    img = (profile_image_url or "").strip()
    if not img:
        img = DEFAULT_PROFILE_IMAGE_URL

    row = {
        "platform": "x",
        "account_name": account_name,
        "account_url": f"https://x.com/{account_name}",
        "profile_image_url": img,
    }
    row = {k: v for k, v in row.items() if k in SNS_ACCOUNTS_COLUMNS}

    resp = sb_upsert(
        "sns_accounts",
        [row],
        on_conflict="platform,account_name",
        select="id",
    )
    return int(resp[0]["id"])


def upsert_accounts_metrics(account_id: int, followers: int, following: int, mediaCount: int) -> None:
    row = {
        "account_id": account_id,
        "metric_date": today_iso(),
        "followers": followers,
        "following": following,
        "created_at": utcnow_iso(),
        "posts": mediaCount,
    }
    row = {k: v for k, v in row.items() if k in ACCOUNTS_METRICS_COLUMNS}

    sb_upsert(
        "accounts_metrics",
        [row],
        on_conflict="account_id,metric_date",
        select="id",
    )

def upsert_full_sns_account_x(account_id: int, author: Dict[str, Any]) -> None:
    stored_image_url = upload_profile_image(
        author.get("profile_image_url"),
        author.get("account_name") or str(account_id),
    )

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
            "campaign_id": None,
            "collaboration_id": None,
        }
        row = {k: v for k, v in row.items() if k in POSTS_COLUMNS}
        post_rows.append(row)

    upserted = sb_upsert("posts", post_rows, on_conflict="external_post_id", select="id,external_post_id")
    post_id_by_ext = {r["external_post_id"]: int(r["id"]) for r in upserted}

    has_metric_date = "metric_date" in POST_METRICS_COLUMNS

    metric_rows: List[Dict[str, Any]] = []
    for t in parsed:
        post_id = post_id_by_ext.get(t["external_post_id"])
        if not post_id:
            continue

        row: Dict[str, Any] = {"post_id": post_id, "created_at": utcnow_iso()}
        if has_metric_date:
            row["metric_date"] = today_iso()

        m = t["metrics"]

        if "likes" in POST_METRICS_COLUMNS:
            row["likes"] = safe_int(m.get("likes"), 0) if m.get("likes") is not None else None
        if "comments" in POST_METRICS_COLUMNS:
            row["comments"] = safe_int(m.get("comments"), 0) if m.get("comments") is not None else None
        if "views" in POST_METRICS_COLUMNS:
            row["views"] = safe_int(m.get("views"), 0) if m.get("views") is not None else None
        if "retweets" in POST_METRICS_COLUMNS:
            row["retweets"] = safe_int(m.get("retweets"), 0) if m.get("retweets") is not None else None
        if "quotes" in POST_METRICS_COLUMNS:
            row["quotes"] = safe_int(m.get("quotes"), 0) if m.get("quotes") is not None else None

        row = {k: v for k, v in row.items() if k in POST_METRICS_COLUMNS}
        metric_rows.append(row)

    if metric_rows:
        on_conflict = "post_id,metric_date" if has_metric_date else None
        sb_upsert("post_metrics", metric_rows, on_conflict=on_conflict, select="id")

# -----------------------
# Main
# -----------------------
def main() -> None:
    keywords = pick_keywords_for_run(KEYWORD_POOL, X_KEYWORDS_PER_RUN)
    print("X KEYWORDS:", keywords)
    print("X settings:", {
        "maxItems": X_MAX_ITEMS,
        "tweetLanguage": X_TWEET_LANGUAGE,
        "sort": X_SORT,
        "minFollowers": MIN_FOLLOWERS,
        "maxTweetsPerAuthor": X_MAX_TWEETS_PER_AUTHOR,
        "jpStrict": JP_STRICT,
        "influencerStrict": INFLUENCER_STRICT,
    })

    for kw in keywords:
        print(f"\n=== keyword: {kw} ===")
        items = apify_run({
            "searchTerms": [f"{kw} lang:{X_TWEET_LANGUAGE}"],
            "maxItems": X_MAX_ITEMS,
            "sort": X_SORT,
            "tweetLanguage": X_TWEET_LANGUAGE,
            "includeSearchTerms": True,
        })
        print("Tweets returned:", len(items))

        authors: Dict[str, Dict[str, Any]] = {}
        tweets_by_author: Dict[str, List[Dict[str, Any]]] = {}

        for it in items:
            a = parse_author(it)
            if not a:
                continue

            if safe_int(a.get("followers"), 0) < MIN_FOLLOWERS:
                continue

            if not influencer_filter(a):
                continue

            uname = a["account_name"]
            authors[uname] = a

            lst = tweets_by_author.setdefault(uname, [])
            if len(lst) < X_MAX_TWEETS_PER_AUTHOR:
                lst.append(it)

        print("Qualified influencers:", len(authors))

        for uname, a in authors.items():
            account_id = ensure_minimal_account_row(
                uname,
                safe_int(a.get("followers"), 0),
                a.get("profile_image_url"),)
            if not account_id:
                continue

            # Debug:
            print("AVATAR_URL", uname, a.get("profile_image_url"))

            upsert_full_sns_account_x(account_id, a)
            upsert_accounts_metrics(account_id, safe_int(a.get("followers"), 0), safe_int(a.get("following"), 0), safe_int(a.get("mediaCount"), 0))
            upsert_posts_and_metrics(account_id, tweets_by_author.get(uname, []))

            if is_trending_db_only(account_id):
                print("TRENDING:", uname, "followers=", safe_int(a.get("followers"), 0))

            time.sleep(0.2)

    print("\nDone.")

if __name__ == "__main__":
    main()
