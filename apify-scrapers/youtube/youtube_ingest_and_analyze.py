import os
import subprocess
import sys
import time
import re
import math
import requests
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple

import regex as regex_u
from dotenv import load_dotenv
from supabase import create_client
from transformers import pipeline

# Classifiers / models (non-LLM)
import fasttext
from detoxify import Detoxify

# JP tokenization for entity/aspect matching
from sudachipy import dictionary, tokenizer as sudachi_tokenizer


load_dotenv()

# -----------------------
# Env
# -----------------------
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


YOUTUBE_API_KEY = must_env("YOUTUBE_API_KEY")
SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

# fastText language model path (download lid.176.bin)
FASTTEXT_LID_PATH = os.getenv("FASTTEXT_LID_PATH", "lid.176.bin").strip()

# =========================
# CONFIG
# =========================
ANALYSIS_VERSION = "v1"
PLATFORM = "youtube"

REL_MAX = env_int("REL_MAX", 200)
TIME_MAX = env_int("TIME_MAX", 100)

SLEEP_BETWEEN_CALLS_SEC = 0.1

# Evidence storage
STORE_EVIDENCE_SNIPPETS = True
EVIDENCE_SNIPPET_LEN = 200
TOP_LIKED_EVIDENCE = 5
MOST_RECENT_EVIDENCE = 5

# Sentiment confidence threshold (below -> neutral)
SENTIMENT_NEUTRAL_THRESHOLD = 0.65

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# -----------------------
# Models (pretrained, non-LLM)
# -----------------------
# Multilingual sentiment (works better than English-only for JP)
sentiment_pipe = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
    truncation=True
)

# Emotion model (mostly English; still usable but JP accuracy may be lower)
# If later swaped to JP emotion model, keep the interface the same
emotion_pipe = pipeline(
    "text-classification",
    model="bhadresh-savani/distilbert-base-uncased-emotion",
    return_all_scores=True,
    truncation=True
)

# Zero-shot topics (multilingual NLI)
topic_pipe = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
    truncation=True
)

# Toxicity/Hate (multilingual)
detox = Detoxify("multilingual")

# Language detection
lang_model = fasttext.load_model(FASTTEXT_LID_PATH)

# JP tokenizer
sudachi = dictionary.Dictionary().create()
sudachi_mode = sudachi_tokenizer.Tokenizer.SplitMode.C


# =========================
# YouTube API
# =========================
def yt_comment_threads(video_id: str, order: str, page_token: Optional[str] = None, max_results: int = 100) -> dict:
    url = "https://www.googleapis.com/youtube/v3/commentThreads"
    params = {
        "part": "snippet",
        "videoId": video_id,
        "maxResults": max_results,
        "order": order,  # "relevance" or "time"
        "textFormat": "plainText",
        "key": YOUTUBE_API_KEY,
    }
    if page_token:
        params["pageToken"] = page_token

    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def fetch_comments_sample(video_id: str, order: str, max_total: int) -> List[Dict]:
    results: List[Dict] = []
    page_token = None

    while len(results) < max_total:
        data = yt_comment_threads(video_id, order=order, page_token=page_token, max_results=100)
        time.sleep(SLEEP_BETWEEN_CALLS_SEC)

        for item in data.get("items", []):
            
            top_level = item["snippet"]["topLevelComment"]
            top = top_level["snippet"]
            author_channel = top.get("authorChannelId") or {}

            results.append({
                "comment_id": top_level.get("id"),
                "commenter_id": author_channel.get("value"),
                "commenter_username": top.get("authorDisplayName"),
                "commenter_display_name": top.get("authorDisplayName"),
                "commenter_profile_pic_url": top.get("authorProfileImageUrl"),
                "commenter_is_private": None,
                "commenter_is_verified": None,
                "commenter_channel_url": top.get("authorChannelUrl"),
                "commenter_is_channel_owner": top.get("authorIsChannelOwner"),
                "text": (top.get("textDisplay") or "").strip(),
                "like_count": int(top.get("likeCount") or 0),
                "published_at": top.get("publishedAt"),
                "updated_at": top.get("updatedAt"),
                "video_id": item.get("snippet", {}).get("videoId"),
                "can_rate": top.get("canRate"),
                "viewer_rating": top.get("viewerRating"),
                "total_reply_count": int(item.get("snippet", {}).get("totalReplyCount") or 0),
            })
            if len(results) >= max_total:
                break

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return results


# =========================
# Filtering
# =========================
EMOJI_ONLY_RE = regex_u.compile(
    r'^\s*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{Emoji}\uFE0F|\p{Emoji_Component}|\u200D)+\s*$'
)

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

JP_GENERIC_LOW_SIGNAL = {
    "すごい","すご","やばい","やば","最高","最高です","神","神です","好き","大好き",
    "可愛い","かわいい","かわよ","かっこいい","うまい","うますぎ","いいね","いい",
    "ナイス","草","笑","w","ww","www","初見","一番","1コメ","一コメ"
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
    # extreme repeated emoji (still catches some emoji-only)
    if t.count("🔥") >= 4 or t.count("❤️") >= 6:
        return True
    # link-only
    if _URL_RE.search(t) and len(_URL_RE.sub("", t).strip()) < 4:
        return True
    # repeated chars (wwwwww, !!!!!, ーーーー)
    if re.search(r"(.)\1{6,}", t):
        return True

    # Very short generic-only (JP + EN) -> treat as spam-like (or downweight; here we filter)
    normalized = t.lower().strip("!?.。、！？」『』（）()[]{}\"'")
    if len(normalized) <= 6 and normalized in EN_GENERIC_LOW_SIGNAL:
        return True
    if normalized in JP_GENERIC_LOW_SIGNAL and len(t) <= 6:
        return True

    return False

def filter_comments(comments: List[Dict]) -> Tuple[List[Dict], float]:
    seen = set()
    kept: List[Dict] = []
    for c in comments:
        txt = c.get("text") or ""
        if is_spam_like(txt):
            continue
        key = normalize_for_dedupe(txt)
        if key in seen:
            continue
        seen.add(key)
        kept.append(c)

    sampled_total = len(comments)
    filtered_total = len(kept)
    spam_rate = (sampled_total - filtered_total) / sampled_total if sampled_total else 0.0
    return kept, spam_rate


# =========================
# Language + Classifiers
# =========================
def detect_language(text: str) -> str:
    # fastText expects a single line
    t = (text or "").replace("\n", " ").strip()
    if not t:
        return "unknown"
    label, prob = lang_model.predict(t)
    if not label:
        return "unknown"
    return label[0].replace("__label__", "")

def classify_sentiment(text: str) -> str:
    """
    Uses multilingual sentiment model. Output labels often like:
      - LABEL_0 / LABEL_1 / LABEL_2 depending on model.
    For cardiffnlp/twitter-xlm-roberta-base-sentiment:
      - negative / neutral / positive (mapped internally).
    We'll map robustly.
    """
    out = sentiment_pipe(text[:512])[0]
    label = (out.get("label") or "").lower()
    score = float(out.get("score") or 0.0)

    # Neutral by confidence threshold (works even for 3-class models)
    if score < SENTIMENT_NEUTRAL_THRESHOLD:
        return "neutral"

    if "pos" in label or "positive" in label:
        return "positive"
    if "neg" in label or "negative" in label:
        return "negative"
    if "neu" in label or "neutral" in label:
        return "neutral"

    # Fallback: treat unknown as neutral
    return "neutral"

def compute_sentiment_split(comments: List[Dict]) -> Tuple[float, float, float]:
    pos = neg = neu = 0
    for c in comments:
        s = classify_sentiment((c.get("text") or ""))
        if s == "positive":
            pos += 1
        elif s == "negative":
            neg += 1
        else:
            neu += 1
    total = max(len(comments), 1)
    return pos / total, neu / total, neg / total

def compute_weighted_sentiment(comments: List[Dict]) -> float:
    # Returns roughly [-1, +1]
    num = 0.0
    den = 0.0
    for c in comments:
        text = (c.get("text") or "")
        s = classify_sentiment(text)
        if s == "positive":
            val = 1.0
        elif s == "negative":
            val = -1.0
        else:
            val = 0.0

        like_count = int(c.get("like_count") or 0)
        w = 1.0 + math.log1p(like_count)
        num += w * val
        den += w
    return (num / den) if den else 0.0

def compute_toxicity_and_hate(comments: List[Dict]) -> Tuple[float, float]:
    """
    Detoxify returns multiple keys.
    We'll use:
      - toxicity as toxicity_score
      - identity_attack as hate_score proxy
    """
    tox_scores = []
    hate_scores = []
    for c in comments:
        text = (c.get("text") or "")[:512]
        out = detox.predict(text)
        tox_scores.append(float(out.get("toxicity", 0.0)))
        hate_scores.append(float(out.get("identity_attack", 0.0)))
    if not tox_scores:
        return 0.0, 0.0
    return sum(tox_scores) / len(tox_scores), sum(hate_scores) / len(hate_scores)

def compute_emotion_distribution(comments: List[Dict]) -> Dict[str, float]:
    """
    Returns distribution of top emotion per comment.
    Note: model is English-biased; still provides useful signals.
    """
    cnt = Counter()
    for c in comments:
        text = (c.get("text") or "")[:512]
        scores = emotion_pipe(text)[0]  # list of dicts
        top = max(scores, key=lambda x: x.get("score", 0.0))
        label = (top.get("label") or "unknown").lower()
        cnt[label] += 1
    total = max(sum(cnt.values()), 1)
    return {k: v / total for k, v in cnt.items()}

def compute_language_distribution(comments: List[Dict]) -> Dict[str, float]:
    cnt = Counter()
    for c in comments:
        lang = detect_language(c.get("text") or "")
        cnt[lang] += 1
    total = max(sum(cnt.values()), 1)
    # keep top 8 to avoid huge json
    top = cnt.most_common(8)
    return {k: v / total for k, v in top}

def compute_topic_labels(comments: List[Dict], top_k: int = 5) -> Dict[str, float]:
    """
    Zero-shot classification over comments using fixed JP labels.
    Returns a normalized distribution of top labels.
    """
    if not comments:
        return {}

    scores = Counter()
    for c in comments:
        text = (c.get("text") or "").strip()
        if not text:
            continue
        out = topic_pipe(text[:512], candidate_labels=TOPIC_LABELS_JA, multi_label=False)
        labels = out.get("labels") or []
        probs = out.get("scores") or []
        if not labels or not probs:
            continue
        top_label = labels[0]
        top_score = float(probs[0])
        like_count = int(c.get("like_count") or 0)
        w = (1.0 + math.log1p(like_count)) * top_score
        scores[top_label] += w

    total = sum(scores.values())
    if total <= 0:
        return {}
    top = scores.most_common(top_k)
    norm_total = sum(v for _, v in top)
    return {k: v / norm_total for k, v in top} if norm_total else {}


# =========================
# Conversion intent (rules)
# =========================
JP_INTENT_PATTERNS = [
    r"どこ(で|に)買え", r"どこ(で|に)売っ", r"リンク(くだ|下)さい", r"URL(くだ|下)さい",
    r"商品名(教えて|なに|知りたい)", r"名前(教えて|なに|知りたい)",
    r"(値段|価格).*(いくら|教えて|高い|安い)", r"買った", r"買いました", r"買う", r"購入", r"注文",
    r"amazon|楽天|メルカリ|公式サイト|公式",  # optional marketplace cues
]
EN_INTENT_PATTERNS = [
    r"where.*buy", r"link please", r"what.*product", r"how much", r"price", r"bought it", r"i will buy", r"order",
    r"amazon|rakuten|official site"
]

JP_INTENT_RE = re.compile("|".join(JP_INTENT_PATTERNS), re.IGNORECASE)
EN_INTENT_RE = re.compile("|".join(EN_INTENT_PATTERNS), re.IGNORECASE)

def conversion_intent_rate(comments: List[Dict]) -> float:
    if not comments:
        return 0.0
    hits = 0
    for c in comments:
        t = (c.get("text") or "").strip()
        if not t:
            continue
        lang = detect_language(t)
        if lang == "ja":
            if JP_INTENT_RE.search(t):
                hits += 1
        else:
            if EN_INTENT_RE.search(t):
                hits += 1
    return hits / len(comments)


# =========================
# Entities + Pros/Cons (no LLM)
# =========================

# Simple brand/product dictionary (expand over time)
BRAND_DICT = {
    "dior", "chanel", "ysl", "uniqlo", "gu", "amazon", "rakuten", "apple", "iphone", "sony", "nintendo"
}
# JP forms too (add as you find)
BRAND_DICT_JP = {"ディオール", "シャネル", "ユニクロ", "アマゾン", "楽天", "アップル", "ソニー", "任天堂"}

def sudachi_tokens(text: str) -> List[str]:
    return [m.surface() for m in sudachi.tokenize(text, sudachi_mode)]

def extract_audience_interest_entities(comments: List[Dict], top_k: int = 20) -> Dict[str, int]:
    """
    Dictionary-based extraction: fast, controllable, good for brands/products.
    """
    cnt = Counter()
    for c in comments:
        t = (c.get("text") or "")
        if not t:
            continue
        # simple matching
        # lower for latin names
        lower = t.lower()
        for b in BRAND_DICT:
            if b in lower:
                cnt[b] += 1
        # JP token matching
        toks = sudachi_tokens(t)
        for tok in toks:
            if tok in BRAND_DICT_JP:
                cnt[tok] += 1
    return dict(cnt.most_common(top_k))

# Aspects for pros/cons (expand per category)
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
    for aspect, kws in ASPECTS.items():
        if any(kw in text for kw in kws):
            found.append(aspect)
    return found

def compute_top_pros_cons(comments: List[Dict], top_n: int = 3) -> Tuple[List[str], List[str]]:
    """
    Aspect-based sentiment: count positive/negative mentions by aspect.
    """
    pos_cnt = Counter()
    neg_cnt = Counter()

    for c in comments:
        t = (c.get("text") or "")
        if not t:
            continue
        aspects = detect_aspects(t)
        if not aspects:
            continue
        s = classify_sentiment(t)
        for a in aspects:
            if s == "positive":
                pos_cnt[a] += 1
            elif s == "negative":
                neg_cnt[a] += 1

    pros = [ASPECT_LABEL_JA.get(a, a) for a, _ in pos_cnt.most_common(top_n)]
    cons = [ASPECT_LABEL_JA.get(a, a) for a, _ in neg_cnt.most_common(top_n)]
    return pros, cons

def build_summary(sent_pos: float, sent_neg: float, tox: float, hate: float, pros: List[str], cons: List[str]) -> str:
    # Simple template (non-LLM)
    tone = "ポジティブ" if sent_pos >= max(sent_neg, 0.2) else "賛否あり"
    risk = "低め" if tox < 0.15 and hate < 0.10 else "注意"
    pro_txt = " / ".join(pros) if pros else "特定しづらい"
    con_txt = " / ".join(cons) if cons else "大きな不満は少なめ"
    return f"雰囲気: {tone}（Pos {sent_pos:.0%}, Neg {sent_neg:.0%}）| リスク: {risk}（Tox {tox:.2f}, Hate {hate:.2f}）| 良い点: {pro_txt} | 気になる点: {con_txt}"


# =========================
# Supabase data access
# =========================
def get_youtube_posts(limit: int = 20) -> List[dict]:
    yt_accounts = supabase.table("sns_accounts").select("id").eq("platform", "youtube").execute().data
    account_ids = [a["id"] for a in yt_accounts]
    if not account_ids:
        return []

    posts = (
        supabase.table("posts")
        .select("id, account_id, external_post_id, posted_at, scraped_at")
        .in_("account_id", account_ids)
        .not_.is_("external_post_id", "null")
        .limit(limit)
        .execute()
        .data
    )
    return posts

def upsert_post_comment_analysis(post_id: int, payload: dict) -> None:
    payload = dict(payload)
    payload["post_id"] = post_id
    payload["analysis_version"] = ANALYSIS_VERSION
    payload["updated_at"] = utcnow_iso()

    supabase.table("post_comment_analysis").upsert(
        payload,
        on_conflict="post_id,analysis_version"
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
    supabase.table("posts").update({
        "scraped_at": utcnow_iso()
    }).eq("id", post_id).execute()

def write_evidence(post_id: int, comments: List[Dict]) -> None:
    if not STORE_EVIDENCE_SNIPPETS:
        return

    top_liked = sorted(comments, key=lambda x: x.get("like_count", 0), reverse=True)[:TOP_LIKED_EVIDENCE]
    most_recent = sorted(comments, key=lambda x: x.get("published_at", ""), reverse=True)[:MOST_RECENT_EVIDENCE]

    rows = []
    for c in top_liked:
        rows.append({
            "post_id": post_id,
            "kind": "top_liked",
            "comment_id": c.get("comment_id"),
            "text_snippet": (c.get("text") or "")[:EVIDENCE_SNIPPET_LEN],
            "like_count": int(c.get("like_count") or 0),
            "published_at": c.get("published_at"),
            "analysis_version": ANALYSIS_VERSION,
            "created_at": utcnow_iso(),
        })
    for c in most_recent:
        rows.append({
            "post_id": post_id,
            "kind": "most_recent",
            "comment_id": c.get("comment_id"),
            "text_snippet": (c.get("text") or "")[:EVIDENCE_SNIPPET_LEN],
            "like_count": int(c.get("like_count") or 0),
            "published_at": c.get("published_at"),
            "analysis_version": ANALYSIS_VERSION,
            "created_at": utcnow_iso(),
        })

    if rows:
        # remove old evidence for this post/version
        supabase.table("post_comment_evidence").delete().eq("post_id", post_id).eq("analysis_version", ANALYSIS_VERSION).execute()
        supabase.table("post_comment_evidence").insert(rows).execute()


# =========================
# Pipeline
# =========================
def process_post(post: dict) -> None:
    post_id = int(post["id"])
    video_id = (post.get("external_post_id") or "").strip()
    if not video_id:
        return

    # Fetch comments
    rel = fetch_comments_sample(video_id, order="relevance", max_total=REL_MAX)
    tim = fetch_comments_sample(video_id, order="time", max_total=TIME_MAX)
    all_comments = rel + tim

    sampled_total = len(all_comments)
    upsert_post_comments_raw(post_id, all_comments)
    if sampled_total == 0:
        upsert_post_comment_analysis(post_id, {
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
            "summary": "コメントが取得できませんでした。",
            "topic_labels": {},
        })
        mark_post_scraped(post_id)
        print(f"[OK] post_id={post_id} video_id={video_id} (no comments)")
        return

    filtered, spam_rate = filter_comments(all_comments)
    filtered_total = len(filtered)

    # If everything filtered out, still save something
    if filtered_total == 0:
        upsert_post_comment_analysis(post_id, {
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
            "summary": "有効なコメントが少なすぎて分析できませんでした。",
            "topic_labels": {},
        })
        mark_post_scraped(post_id)
        print(f"[OK] post_id={post_id} video_id={video_id} (all filtered)")
        return

    # ---- Classifier-based fields ----
    sentiment_pos, sentiment_neu, sentiment_neg = compute_sentiment_split(filtered)
    weighted_sentiment = compute_weighted_sentiment(filtered)
    toxicity_score, hate_score = compute_toxicity_and_hate(filtered)
    language_distribution = compute_language_distribution(filtered)
    emotion_distribution = compute_emotion_distribution(filtered)
    topic_labels = compute_topic_labels(filtered)

    # ---- Non-LLM derived fields ----
    entities = extract_audience_interest_entities(filtered, top_k=20)
    intent_rate = conversion_intent_rate(filtered)
    pros, cons = compute_top_pros_cons(filtered, top_n=3)
    summary = build_summary(sentiment_pos, sentiment_neg, toxicity_score, hate_score, pros, cons)

    upsert_post_comment_analysis(post_id, {
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
    })

    # Evidence snippets (5 top liked + 5 most recent)
    write_evidence(post_id, filtered)

    mark_post_scraped(post_id)
    print(f"[OK] post_id={post_id} video_id={video_id} sampled={sampled_total} kept={filtered_total} spam_rate={spam_rate:.3f}")

def main():
    posts = get_youtube_posts(limit=1000000)
    if not posts:
        print("No YouTube posts found.")
        return

    for p in posts:
        try:
            process_post(p)
        except requests.HTTPError as e:
            print(f"[HTTP ERROR] post_id={p.get('id')} video_id={p.get('external_post_id')} err={e}")
        except Exception as e:
            print(f"[ERROR] post_id={p.get('id')} video_id={p.get('external_post_id')} err={e}")

    if os.getenv("RUN_ACCOUNT_AGGREGATE", "0").strip() == "1":
        try:
            subprocess.run(
                [sys.executable, "apify-scrapers/youtube/youtube_account_aggregate.py"],
                check=True,
            )
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] account aggregation failed: {e}")

if __name__ == "__main__":
    main()
