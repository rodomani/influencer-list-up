import math
import os
import re
import requests
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlsplit, urlunsplit

import fasttext
import regex as regex_u
from detoxify import Detoxify
from dotenv import load_dotenv
from sudachipy import dictionary, tokenizer as sudachi_tokenizer
from supabase import create_client
from transformers import pipeline


load_dotenv()


def must_env(k: str) -> str:
    v = os.getenv(k)
    if not v:
        raise RuntimeError(f"Missing env var: {k}")
    return v.strip()


def env_int(k: str, default: int) -> int:
    v = os.getenv(k)
    return int(v) if v and v.strip() else default


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def first(it: Dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = it.get(key)
        if value is None:
            continue
        if isinstance(value, str) and value.strip() == "":
            continue
        return value
    return None


APIFY_TOKEN = must_env("APIFY_TOKEN")
SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

FASTTEXT_LID_PATH = os.getenv("FASTTEXT_LID_PATH", "lid.176.bin").strip()

ANALYSIS_VERSION = "v1"
PLATFORM = "x"

REL_MAX = env_int("REL_MAX", 200)
TIME_MAX = env_int("TIME_MAX", 100)
POST_LIMIT = env_int("X_POST_LIMIT", 100000)

SLEEP_BETWEEN_CALLS_SEC = 0.2

X_REPLY_ACTOR = os.getenv("X_REPLY_ACTOR", "fastcrawler/twitter-x-comment-scraper-no-cookies-required").strip()
X_REPLY_ACTOR_API_ID = X_REPLY_ACTOR.replace("/", "~")
def normalize_ranking_mode(raw: str, fallback: str) -> str:
    value = (raw or "").strip().lower()
    if value in {"top", "relevance", "relevant"}:
        return "Relevance"
    if value in {"latest", "recent", "recency", "new"}:
        return "Recency"
    if value in {"likes", "liked", "most_liked"}:
        return "Likes"
    return fallback


X_REPLY_TOP_RANKING_MODE = normalize_ranking_mode(
    os.getenv("X_REPLY_TOP_RANKING_MODE", "Relevance"),
    "Relevance",
)
X_REPLY_TIME_RANKING_MODE = normalize_ranking_mode(
    os.getenv("X_REPLY_TIME_RANKING_MODE", "Recency"),
    "Recency",
)

STORE_EVIDENCE_SNIPPETS = True
EVIDENCE_SNIPPET_LEN = 200
TOP_LIKED_EVIDENCE = 5
MOST_RECENT_EVIDENCE = 5

SENTIMENT_NEUTRAL_THRESHOLD = 0.65

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

sentiment_pipe = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
    truncation=True,
)

emotion_pipe = pipeline(
    "text-classification",
    model="bhadresh-savani/distilbert-base-uncased-emotion",
    return_all_scores=True,
    truncation=True,
)

topic_pipe = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
    truncation=True,
)

detox = Detoxify("multilingual")
lang_model = fasttext.load_model(FASTTEXT_LID_PATH)
sudachi = dictionary.Dictionary().create()
sudachi_mode = sudachi_tokenizer.Tokenizer.SplitMode.C

X_STATUS_URL_RE = re.compile(
    r"https?://(?:www\.)?(?:x|twitter)\.com/(?:(?:i(?:/web)?|[^/?#]+)/status)/(\d+)",
    re.IGNORECASE,
)


def apify_run_x_replies(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = f"https://api.apify.com/v2/acts/{X_REPLY_ACTOR_API_ID}/run-sync-get-dataset-items"
    r = requests.post(url, params={"token": APIFY_TOKEN}, json=payload, timeout=300)
    if not r.ok:
        raise RuntimeError(f"Apify error {r.status_code}: {r.text[:800]}")
    data = r.json()
    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected Apify response: {str(data)[:800]}")
    return data


def normalize_url(url: Optional[str]) -> str:
    if not url:
        return ""
    try:
        parsed = urlsplit(str(url).strip())
        scheme = parsed.scheme or "https"
        netloc = parsed.netloc.lower()
        path = parsed.path.rstrip("/")
        return urlunsplit((scheme, netloc, path, "", ""))
    except Exception:
        return str(url).strip()


def status_id_from_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    m = X_STATUS_URL_RE.search(str(url).strip())
    if not m:
        return None
    return m.group(1)


def normalize_timestamp(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat()
        except Exception:
            return None

    text = str(value).strip()
    if not text:
        return None

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).isoformat()
    except Exception:
        pass

    for fmt in ("%a %b %d %H:%M:%S %z %Y", "%Y-%m-%d %H:%M:%S%z", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(text, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            continue
    return text


def build_payload(post_url: str, ranking_mode: str, max_items: int) -> Dict[str, Any]:
    return {
        "tweetUrl": post_url,
        "rankingMode": ranking_mode,
        "maxItems": int(max_items),
    }


def extract_reply_items(
    raw_items: List[Dict[str, Any]],
    root_url: str,
    root_status_id: Optional[str],
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    root_url_norm = normalize_url(root_url)

    for item in raw_items:
        if not isinstance(item, dict):
            continue

        nested_replies = item.get("replies")
        if isinstance(nested_replies, list):
            out.extend([reply for reply in nested_replies if isinstance(reply, dict)])

        text = first(item, "replyContent", "text", "fullText", "content", "replyText", "tweetText")
        if text is None:
            continue

        item_url = normalize_url(first(item, "replyUrl", "url", "tweetUrl", "twitterUrl", "postUrl"))
        item_status_id = first(item, "replyId", "id", "tweetId", "restId", "commentId")
        item_status_id = str(item_status_id) if item_status_id is not None else None
        if item_status_id is None and item_url:
            item_status_id = status_id_from_url(item_url)

        if root_status_id and item_status_id == str(root_status_id):
            continue
        if root_url_norm and item_url and item_url == root_url_norm:
            continue

        out.append(item)

    return out


def normalize_reply(item: Dict[str, Any]) -> Dict[str, Any]:
    comment_id = item.get("commentId") or item.get("id") or item.get("replyId")
    text = (item.get("replyContent") or item.get("text") or "").strip()
    like_count = item.get("likeCount") or 0
    published_at = item.get("createdAt") or item.get("timestamp") or item.get("date")

    return {
        "comment_id": str(comment_id) if comment_id is not None else None,
        "commenter_id": str(item.get("userId")) if item.get("userId") is not None else None,
        "commenter_username": item.get("twitterUsername"),
        "commenter_display_name": item.get("twitterName"),
        "commenter_profile_pic_url": None,
        "commenter_is_private": None,
        "commenter_is_verified": bool(item.get("isBlueVerified")) if item.get("isBlueVerified") is not None else None,
        "text": text,
        "like_count": int(like_count or 0),
        "published_at": published_at,
        "replies_count": int(item.get("replyCount") or 0),
        "retweet_count": int(item.get("retweetCount") or 0),
        "quote_count": int(item.get("quoteCount") or 0),
        "bookmark_count": int(item.get("bookmarkCount") or 0),
        "view_count": int(item.get("viewCount") or 0),
        "conversation_id": str(item.get("conversationId")) if item.get("conversationId") is not None else None,
        "in_reply_to_username": item.get("inReplytoscreenName"),
        "origin_text": item.get("origin_text"),
    }



def fetch_comments_sample(post_url: str, external_post_id: Optional[str] = None) -> List[Dict]:
    errors: List[str] = []
    collected: List[Dict[str, Any]] = []

    modes: List[Tuple[str, int]] = []
    if REL_MAX > 0:
        modes.append((X_REPLY_TOP_RANKING_MODE, REL_MAX))
    if TIME_MAX > 0:
        modes.append((X_REPLY_TIME_RANKING_MODE, TIME_MAX))

    for ranking_mode, max_items in modes:
        try:
            payload = build_payload(post_url, ranking_mode=ranking_mode, max_items=max_items)
            raw_items = apify_run_x_replies(payload)
            collected.extend(raw_items)
            time.sleep(SLEEP_BETWEEN_CALLS_SEC)
        except RuntimeError as e:
            errors.append(f"{ranking_mode}: {e}")

    if not collected and errors:
        sample = " | ".join(errors[:3])
        raise RuntimeError(f"Unable to fetch X replies for {post_url}: {sample}")

    items = extract_reply_items(collected, root_url=post_url, root_status_id=external_post_id)
    comments = [normalize_reply(item) for item in items]
    comments = [comment for comment in comments if comment.get("text")]

    deduped: List[Dict[str, Any]] = []
    seen_keys = set()
    for comment in comments:
        dedupe_key = comment.get("comment_id") or normalize_for_dedupe(comment.get("text") or "")
        if not dedupe_key or dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        deduped.append(comment)

    rel = sorted(deduped, key=lambda x: int(x.get("like_count") or 0), reverse=True)[:REL_MAX]
    tim = sorted(deduped, key=lambda x: x.get("published_at") or "", reverse=True)[:TIME_MAX]
    return rel + tim


EMOJI_ONLY_RE = regex_u.compile(
    r"^\s*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{Emoji}\uFE0F|\p{Emoji_Component}|\u200D)+\s*$"
)

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

JP_GENERIC_LOW_SIGNAL = {
    "すごい",
    "すご",
    "やばい",
    "やば",
    "最高",
    "最高です",
    "神",
    "神です",
    "好き",
    "大好き",
    "可愛い",
    "かわいい",
    "かわよ",
    "かっこいい",
    "うまい",
    "うますぎ",
    "いいね",
    "いい",
    "ナイス",
    "草",
    "笑",
    "w",
    "ww",
    "www",
    "初見",
    "一番",
    "1コメ",
    "一コメ",
}
EN_GENERIC_LOW_SIGNAL = {"nice", "cool", "first", "love", "great", "amazing"}


def is_emoji_only(text: str) -> bool:
    if not text or not text.strip():
        return False
    return bool(EMOJI_ONLY_RE.match(text))


def normalize_for_dedupe(text: str) -> str:
    t = (text or "").lower().strip()
    t = re.sub(r"\s+", " ", t)
    t = _URL_RE.sub("", t)
    return t


def is_spam_like(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 4:
        return True
    if is_emoji_only(t):
        return True
    if t.count("🔥") >= 4 or t.count("❤️") >= 6:
        return True
    if _URL_RE.search(t) and len(_URL_RE.sub("", t).strip()) < 4:
        return True
    if re.search(r"(.)\1{6,}", t):
        return True

    normalized = t.lower().strip("!?.。、！？」「『』（）()[]{}\"'")
    if len(normalized) <= 6 and normalized in EN_GENERIC_LOW_SIGNAL:
        return True
    if normalized in JP_GENERIC_LOW_SIGNAL and len(t) <= 6:
        return True

    return False


def filter_comments(comments: List[Dict]) -> Tuple[List[Dict], float]:
    seen = set()
    kept: List[Dict] = []
    for comment in comments:
        txt = comment.get("text") or ""
        if is_spam_like(txt):
            continue
        key = normalize_for_dedupe(txt)
        if key in seen:
            continue
        seen.add(key)
        kept.append(comment)

    sampled_total = len(comments)
    filtered_total = len(kept)
    spam_rate = (sampled_total - filtered_total) / sampled_total if sampled_total else 0.0
    return kept, spam_rate


def detect_language(text: str) -> str:
    t = (text or "").replace("\n", " ").strip()
    if not t:
        return "unknown"
    label, _prob = lang_model.predict(t)
    if not label:
        return "unknown"
    return label[0].replace("__label__", "")


def classify_sentiment(text: str) -> str:
    out = sentiment_pipe(text[:512])[0]
    label = (out.get("label") or "").lower()
    score = float(out.get("score") or 0.0)

    if score < SENTIMENT_NEUTRAL_THRESHOLD:
        return "neutral"

    if "pos" in label or "positive" in label:
        return "positive"
    if "neg" in label or "negative" in label:
        return "negative"
    if "neu" in label or "neutral" in label:
        return "neutral"

    return "neutral"


def compute_sentiment_split(comments: List[Dict]) -> Tuple[float, float, float]:
    pos = neg = neu = 0
    for comment in comments:
        sentiment = classify_sentiment(comment.get("text") or "")
        if sentiment == "positive":
            pos += 1
        elif sentiment == "negative":
            neg += 1
        else:
            neu += 1
    total = max(len(comments), 1)
    return pos / total, neu / total, neg / total


def compute_weighted_sentiment(comments: List[Dict]) -> float:
    num = 0.0
    den = 0.0
    for comment in comments:
        sentiment = classify_sentiment(comment.get("text") or "")
        if sentiment == "positive":
            value = 1.0
        elif sentiment == "negative":
            value = -1.0
        else:
            value = 0.0

        like_count = int(comment.get("like_count") or 0)
        weight = 1.0 + math.log1p(like_count)
        num += weight * value
        den += weight
    return (num / den) if den else 0.0


def compute_toxicity_and_hate(comments: List[Dict]) -> Tuple[float, float]:
    tox_scores = []
    hate_scores = []
    for comment in comments:
        text = (comment.get("text") or "")[:512]
        out = detox.predict(text)
        tox_scores.append(float(out.get("toxicity", 0.0)))
        hate_scores.append(float(out.get("identity_attack", 0.0)))
    if not tox_scores:
        return 0.0, 0.0
    return sum(tox_scores) / len(tox_scores), sum(hate_scores) / len(hate_scores)


def compute_emotion_distribution(comments: List[Dict]) -> Dict[str, float]:
    cnt = Counter()
    for comment in comments:
        text = (comment.get("text") or "")[:512]
        scores = emotion_pipe(text)[0]
        top = max(scores, key=lambda x: x.get("score", 0.0))
        label = (top.get("label") or "unknown").lower()
        cnt[label] += 1
    total = max(sum(cnt.values()), 1)
    return {k: v / total for k, v in cnt.items()}


def compute_language_distribution(comments: List[Dict]) -> Dict[str, float]:
    cnt = Counter()
    for comment in comments:
        lang = detect_language(comment.get("text") or "")
        cnt[lang] += 1
    total = max(sum(cnt.values()), 1)
    top = cnt.most_common(8)
    return {k: v / total for k, v in top}


JP_INTENT_PATTERNS = [
    r"どこ(で|に)買え",
    r"どこ(で|に)売っ",
    r"リンク(くだ|下)さい",
    r"URL(くだ|下)さい",
    r"商品名(教えて|なに|知りたい)",
    r"名前(教えて|なに|知りたい)",
    r"(値段|価格).*(いくら|教えて|高い|安い)",
    r"買った",
    r"買いました",
    r"買う",
    r"購入",
    r"注文",
    r"amazon|楽天|メルカリ|公式サイト|公式",
]
EN_INTENT_PATTERNS = [
    r"where.*buy",
    r"link please",
    r"what.*product",
    r"how much",
    r"price",
    r"bought it",
    r"i will buy",
    r"order",
    r"amazon|rakuten|official site",
]

JP_INTENT_RE = re.compile("|".join(JP_INTENT_PATTERNS), re.IGNORECASE)
EN_INTENT_RE = re.compile("|".join(EN_INTENT_PATTERNS), re.IGNORECASE)


def conversion_intent_rate(comments: List[Dict]) -> float:
    if not comments:
        return 0.0
    hits = 0
    for comment in comments:
        text = (comment.get("text") or "").strip()
        if not text:
            continue
        lang = detect_language(text)
        if lang == "ja":
            if JP_INTENT_RE.search(text):
                hits += 1
        else:
            if EN_INTENT_RE.search(text):
                hits += 1
    return hits / len(comments)


BRAND_DICT = {
    "dior",
    "chanel",
    "ysl",
    "uniqlo",
    "gu",
    "amazon",
    "rakuten",
    "apple",
    "iphone",
    "sony",
    "nintendo",
}
BRAND_DICT_JP = {"ディオール", "シャネル", "ユニクロ", "アマゾン", "楽天", "アップル", "ソニー", "任天堂"}


def sudachi_tokens(text: str) -> List[str]:
    return [m.surface() for m in sudachi.tokenize(text, sudachi_mode)]


def extract_audience_interest_entities(comments: List[Dict], top_k: int = 20) -> Dict[str, int]:
    cnt = Counter()
    for comment in comments:
        text = comment.get("text") or ""
        if not text:
            continue
        lower = text.lower()
        for brand in BRAND_DICT:
            if brand in lower:
                cnt[brand] += 1
        tokens = sudachi_tokens(text)
        for token in tokens:
            if token in BRAND_DICT_JP:
                cnt[token] += 1
    return dict(cnt.most_common(top_k))


ASPECTS = {
    "editing": ["編集", "カット", "テンポ", "構成"],
    "clarity": ["分かりやすい", "わかりやすい", "丁寧", "説明"],
    "authenticity": ["正直", "本音", "信用", "リアル", "自然"],
    "sponsored_feel": ["案件", "PR", "広告", "提供", "ステマ"],
    "price": ["値段", "価格", "高い", "安い", "コスパ"],
    "audio": ["音", "音質", "聞きづらい", "小さい", "うるさい"],
    "length": ["長い", "短い", "テンポ悪い"],
    "quality": ["質", "品質", "効果", "良い", "微妙"],
}

ASPECT_LABEL_JA = {
    "editing": "編集が良い/悪い",
    "clarity": "分かりやすい/分かりづらい",
    "authenticity": "自然体/信用",
    "sponsored_feel": "案件感",
    "price": "値段/コスパ",
    "audio": "音",
    "length": "長さ",
    "quality": "品質/効果",
}

TOPIC_LABELS_JA = [
    "グルメ",
    "コスメ",
    "ファッション",
    "旅行",
    "ゲーム",
    "音楽",
    "映画",
    "アニメ",
    "スポーツ",
    "テクノロジー",
    "教育",
    "健康",
    "ライフスタイル",
    "ニュース",
]


def detect_aspects(text: str) -> List[str]:
    found = []
    for aspect, keywords in ASPECTS.items():
        if any(keyword in text for keyword in keywords):
            found.append(aspect)
    return found


def compute_top_pros_cons(comments: List[Dict], top_n: int = 3) -> Tuple[List[str], List[str]]:
    pos_cnt = Counter()
    neg_cnt = Counter()

    for comment in comments:
        text = comment.get("text") or ""
        if not text:
            continue
        aspects = detect_aspects(text)
        if not aspects:
            continue
        sentiment = classify_sentiment(text)
        for aspect in aspects:
            if sentiment == "positive":
                pos_cnt[aspect] += 1
            elif sentiment == "negative":
                neg_cnt[aspect] += 1

    pros = [ASPECT_LABEL_JA.get(aspect, aspect) for aspect, _ in pos_cnt.most_common(top_n)]
    cons = [ASPECT_LABEL_JA.get(aspect, aspect) for aspect, _ in neg_cnt.most_common(top_n)]
    return pros, cons


def build_summary(sent_pos: float, sent_neg: float, tox: float, hate: float, pros: List[str], cons: List[str]) -> str:
    tone = "ポジティブ" if sent_pos >= max(sent_neg, 0.2) else "賛否あり"
    risk = "低め" if tox < 0.15 and hate < 0.10 else "注意"
    pro_txt = " / ".join(pros) if pros else "特定しづらい"
    con_txt = " / ".join(cons) if cons else "大きな不満は少なめ"
    return f"雰囲気: {tone}（Pos {sent_pos:.0%}, Neg {sent_neg:.0%}）| リスク: {risk}（Tox {tox:.2f}, Hate {hate:.2f}）| 良い点: {pro_txt} | 気になる点: {con_txt}"


def compute_topic_labels(comments: List[Dict], top_k: int = 5) -> Dict[str, float]:
    if not comments:
        return {}

    scores = Counter()
    for comment in comments:
        text = (comment.get("text") or "").strip()
        if not text:
            continue
        out = topic_pipe(text[:512], candidate_labels=TOPIC_LABELS_JA, multi_label=False)
        labels = out.get("labels") or []
        probs = out.get("scores") or []
        if not labels or not probs:
            continue
        top_label = labels[0]
        top_score = float(probs[0])
        like_count = int(comment.get("like_count") or 0)
        weight = (1.0 + math.log1p(like_count)) * top_score
        scores[top_label] += weight

    total = sum(scores.values())
    if total <= 0:
        return {}
    top = scores.most_common(top_k)
    norm_total = sum(v for _, v in top)
    return {k: v / norm_total for k, v in top} if norm_total else {}


def get_x_posts(limit: int = 20) -> List[dict]:
    x_accounts = (
        supabase.table("sns_accounts")
        .select("id,account_name")
        .eq("platform", PLATFORM)
        .execute()
        .data
    )
    account_ids = [a["id"] for a in x_accounts]
    if not account_ids:
        return []

    account_name_by_id = {int(a["id"]): a.get("account_name") for a in x_accounts}
    posts = (
        supabase.table("posts")
        .select("id, account_id, external_post_id, link, posted_at, scraped_at")
        .in_("account_id", account_ids)
        .not_.is_("external_post_id", "null")
        .limit(limit)
        .execute()
        .data
    )
    for post in posts:
        post["account_name"] = account_name_by_id.get(int(post["account_id"]))
    return posts


def upsert_post_comment_analysis(post_id: int, payload: dict) -> None:
    payload = dict(payload)
    payload["post_id"] = post_id
    payload["analysis_version"] = ANALYSIS_VERSION
    payload["updated_at"] = utcnow_iso()

    supabase.table("post_comment_analysis").upsert(
        payload, on_conflict="post_id,analysis_version"
    ).execute()


def upsert_post_comments_raw(post_id: int, comments: List[Dict[str, Any]]) -> None:
    if not comments:
        return

    collected_at = utcnow_iso()
    rows: List[Dict[str, Any]] = []
    seen_keys = set()

    for comment in comments:
        comment_id = comment.get("comment_id")
        text = comment.get("text")
        dedupe_key = comment_id or f"{comment.get('published_at')}|{text}"
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)

        row = {
            "post_id": post_id,
            "platform": PLATFORM,
            "comment_id": comment_id,
            "commenter_id": comment.get("commenter_id"),
            "commenter_username": comment.get("commenter_username"),
            "commenter_display_name": comment.get("commenter_display_name"),
            "commenter_profile_pic_url": comment.get("commenter_profile_pic_url"),
            "commenter_is_private": comment.get("commenter_is_private"),
            "commenter_is_verified": comment.get("commenter_is_verified"),
            "text": text,
            "like_count": int(comment.get("like_count") or 0),
            "published_at": comment.get("published_at"),
            "collected_at": collected_at,
        }
        rows.append(row)

    if rows:
        supabase.table("post_comments_raw").delete().eq("post_id", post_id).execute()
        supabase.table("post_comments_raw").insert(rows).execute()


def mark_post_scraped(post_id: int) -> None:
    supabase.table("posts").update({"scraped_at": utcnow_iso()}).eq("id", post_id).execute()


def write_evidence(post_id: int, comments: List[Dict]) -> None:
    if not STORE_EVIDENCE_SNIPPETS:
        return

    top_liked = sorted(comments, key=lambda x: x.get("like_count", 0), reverse=True)[:TOP_LIKED_EVIDENCE]
    most_recent = sorted(comments, key=lambda x: x.get("published_at", ""), reverse=True)[:MOST_RECENT_EVIDENCE]

    rows = []
    for comment in top_liked:
        rows.append(
            {
                "post_id": post_id,
                "kind": "top_liked",
                "comment_id": comment.get("comment_id"),
                "text_snippet": (comment.get("text") or "")[:EVIDENCE_SNIPPET_LEN],
                "like_count": int(comment.get("like_count") or 0),
                "published_at": comment.get("published_at"),
                "analysis_version": ANALYSIS_VERSION,
                "created_at": utcnow_iso(),
            }
        )
    for comment in most_recent:
        rows.append(
            {
                "post_id": post_id,
                "kind": "most_recent",
                "comment_id": comment.get("comment_id"),
                "text_snippet": (comment.get("text") or "")[:EVIDENCE_SNIPPET_LEN],
                "like_count": int(comment.get("like_count") or 0),
                "published_at": comment.get("published_at"),
                "analysis_version": ANALYSIS_VERSION,
                "created_at": utcnow_iso(),
            }
        )

    if rows:
        supabase.table("post_comment_evidence").delete().eq("post_id", post_id).eq(
            "analysis_version", ANALYSIS_VERSION
        ).execute()
        supabase.table("post_comment_evidence").insert(rows).execute()


def process_post(post: dict) -> None:
    post_id = int(post["id"])
    external_id = (post.get("external_post_id") or "").strip()
    post_url = (post.get("link") or "").strip()
    account_name = str(post.get("account_name") or "").strip().lstrip("@")

    if not post_url and external_id and account_name:
        post_url = f"https://x.com/{account_name}/status/{external_id}"
    elif not post_url and external_id:
        post_url = f"https://x.com/i/web/status/{external_id}"

    if not post_url:
        return

    all_comments = fetch_comments_sample(post_url, external_post_id=external_id or None)

    sampled_total = len(all_comments)
    upsert_post_comments_raw(post_id, all_comments)
    if sampled_total == 0:
        upsert_post_comment_analysis(
            post_id,
            {
                "sample_strategy": f"rel{REL_MAX}_time{TIME_MAX}",
                "sampled_total": 0,
                "filtered_total": 0,
                "spam_rate": 0.0,
                "sentiment_pos": 0.0,
                "sentiment_neu": 0.0,
                "sentiment_neg": 0.0,
                "weighted_sentiment": 0.0,
                "toxicity_score": 0.0,
                "hate_score": 0.0,
                "emotion_distribution": {},
                "language_distribution": {},
                "audience_interest_entities": {},
                "conversion_intent_rate": 0.0,
                "top_pros": [],
                "top_cons": [],
                "summary": "返信が取得できませんでした。",
                "topic_labels": {},
            },
        )
        mark_post_scraped(post_id)
        print(f"[OK] post_id={post_id} post_url={post_url} (no replies)")
        return

    filtered, spam_rate = filter_comments(all_comments)
    filtered_total = len(filtered)

    if filtered_total == 0:
        upsert_post_comment_analysis(
            post_id,
            {
                "sample_strategy": f"rel{REL_MAX}_time{TIME_MAX}",
                "sampled_total": sampled_total,
                "filtered_total": 0,
                "spam_rate": spam_rate,
                "sentiment_pos": 0.0,
                "sentiment_neu": 1.0,
                "sentiment_neg": 0.0,
                "weighted_sentiment": 0.0,
                "toxicity_score": 0.0,
                "hate_score": 0.0,
                "emotion_distribution": {},
                "language_distribution": {},
                "audience_interest_entities": {},
                "conversion_intent_rate": 0.0,
                "top_pros": [],
                "top_cons": [],
                "summary": "有効な返信が少なすぎて分析できませんでした。",
                "topic_labels": {},
            },
        )
        mark_post_scraped(post_id)
        print(f"[OK] post_id={post_id} post_url={post_url} (all filtered)")
        return

    sentiment_pos, sentiment_neu, sentiment_neg = compute_sentiment_split(filtered)
    weighted_sentiment = compute_weighted_sentiment(filtered)
    toxicity_score, hate_score = compute_toxicity_and_hate(filtered)
    language_distribution = compute_language_distribution(filtered)
    emotion_distribution = compute_emotion_distribution(filtered)

    entities = extract_audience_interest_entities(filtered, top_k=20)
    intent_rate = conversion_intent_rate(filtered)
    pros, cons = compute_top_pros_cons(filtered, top_n=3)
    summary = build_summary(sentiment_pos, sentiment_neg, toxicity_score, hate_score, pros, cons)
    topic_labels = compute_topic_labels(filtered)

    upsert_post_comment_analysis(
        post_id,
        {
            "sample_strategy": f"rel{REL_MAX}_time{TIME_MAX}",
            "sampled_total": sampled_total,
            "filtered_total": filtered_total,
            "spam_rate": spam_rate,
            "sentiment_pos": sentiment_pos,
            "sentiment_neu": sentiment_neu,
            "sentiment_neg": sentiment_neg,
            "weighted_sentiment": weighted_sentiment,
            "toxicity_score": toxicity_score,
            "hate_score": hate_score,
            "emotion_distribution": emotion_distribution,
            "language_distribution": language_distribution,
            "audience_interest_entities": entities,
            "conversion_intent_rate": intent_rate,
            "top_pros": pros,
            "top_cons": cons,
            "summary": summary,
            "topic_labels": topic_labels,
        },
    )

    write_evidence(post_id, filtered)
    mark_post_scraped(post_id)
    print(
        f"[OK] post_id={post_id} post_url={post_url} sampled={sampled_total} kept={filtered_total} spam_rate={spam_rate:.3f}"
    )


def main():
    posts = get_x_posts(limit=POST_LIMIT)
    if not posts:
        print("No X posts found.")
        return

    for post in posts:
        try:
            process_post(post)
        except requests.HTTPError as e:
            print(f"[HTTP ERROR] post_id={post.get('id')} post_url={post.get('link')} err={e}")
        except Exception as e:
            print(f"[ERROR] post_id={post.get('id')} post_url={post.get('link')} err={e}")

    if os.getenv("RUN_ACCOUNT_AGGREGATE", "0").strip() == "1":
        try:
            subprocess.run(
                [sys.executable, "apify-scrapers/X/x_account_aggregate.py"],
                check=True,
            )
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] account aggregation failed: {e}")


if __name__ == "__main__":
    main()
