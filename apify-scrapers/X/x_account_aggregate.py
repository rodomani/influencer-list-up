import os
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional

from dotenv import load_dotenv
from supabase import create_client


load_dotenv()


def must_env(k: str) -> str:
    v = os.getenv(k)
    if not v:
        raise RuntimeError(f"Missing env var: {k}")
    return v.strip()


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


SUPABASE_URL = must_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

ANALYSIS_VERSION = "v1"
PLATFORM = "x"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def mean(xs: List[float]) -> Optional[float]:
    xs = [x for x in xs if x is not None]
    if not xs:
        return None
    return sum(xs) / len(xs)


def get_x_account_ids(limit: int = 50) -> List[int]:
    rows = (
        supabase.table("sns_accounts")
        .select("id")
        .eq("platform", PLATFORM)
        .limit(limit)
        .execute()
        .data
    )
    return [int(r["id"]) for r in rows]


def get_all_post_ids_for_account(account_id: int, page_size: int = 1000) -> List[int]:
    all_ids: List[int] = []
    offset = 0
    while True:
        rows = (
            supabase.table("posts")
            .select("id")
            .eq("account_id", account_id)
            .order("id", desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
            .data
        )
        if not rows:
            break
        all_ids.extend(int(r["id"]) for r in rows)
        offset += page_size
    return all_ids


def get_post_analyses(post_ids: List[int]) -> List[dict]:
    if not post_ids:
        return []
    return (
        supabase.table("post_comment_analysis")
        .select(
            "post_id, spam_rate, sentiment_pos, sentiment_neu, sentiment_neg, "
            "toxicity_score, hate_score, weighted_sentiment, "
            "language_distribution, emotion_distribution, topic_labels, "
            "conversion_intent_rate, sampled_total, filtered_total"
        )
        .eq("analysis_version", ANALYSIS_VERSION)
        .in_("post_id", post_ids)
        .execute()
        .data
    )


def merge_distributions_weighted(
    rows: List[dict],
    field: str,
    weight_field: str,
    top_k: int = 10,
) -> Dict[str, float]:
    acc = defaultdict(float)
    total_w = 0.0
    for row in rows:
        dist = row.get(field) or {}
        weight = float(row.get(weight_field) or 0.0)
        if weight <= 0:
            continue
        total_w += weight
        for key, value in dist.items():
            acc[key] += float(value) * weight
    if total_w <= 0:
        return {}
    sorted_items = sorted(acc.items(), key=lambda x: x[1], reverse=True)[:top_k]
    norm_total = sum(v for _, v in sorted_items)
    return {k: v / norm_total for k, v in sorted_items} if norm_total else {}


def merge_topics(rows: List[dict], field: str, weight_field: str, top_k: int = 10) -> Dict[str, float]:
    acc = defaultdict(float)
    total_w = 0.0
    for row in rows:
        topics = row.get(field)
        if not topics:
            continue
        weight = float(row.get(weight_field) or 0.0)
        if weight <= 0:
            continue
        total_w += weight
        if isinstance(topics, list):
            for topic in topics:
                if topic:
                    acc[str(topic)] += weight
        elif isinstance(topics, dict):
            for key, value in topics.items():
                acc[str(key)] += float(value) * weight
        else:
            acc[str(topics)] += weight
    if total_w <= 0:
        return {}
    sorted_items = sorted(acc.items(), key=lambda x: x[1], reverse=True)[:top_k]
    norm_total = sum(v for _, v in sorted_items)
    return {k: v / norm_total for k, v in sorted_items} if norm_total else {}


def upsert_influencer_average(account_id: int, window_label: str, analyses: List[dict]) -> None:
    spam_rates = [analysis.get("spam_rate") for analysis in analyses]
    tox = [analysis.get("toxicity_score") for analysis in analyses]
    hate = [analysis.get("hate_score") for analysis in analyses]
    wsent = [analysis.get("weighted_sentiment") for analysis in analyses]
    intent = [analysis.get("conversion_intent_rate") for analysis in analyses]

    sampled_totals = [int(analysis.get("sampled_total") or 0) for analysis in analyses]
    filtered_totals = [int(analysis.get("filtered_total") or 0) for analysis in analyses]

    now_iso = utcnow_iso()

    payload = {
        "account_id": account_id,
        "window": window_label,
        "posts_count": len(analyses),
        "avg_sentiment": mean(wsent),
        "avg_toxicity": mean(tox),
        "avg_hate_score": mean(hate),
        "avg_conversion_intent_rate": mean(intent),
        "avg_spam_rate": mean(spam_rates),
        "sum_sampled_total": sum(sampled_totals),
        "sum_filtered_total": sum(filtered_totals),
        "avg_emotion": merge_distributions_weighted(analyses, "emotion_distribution", "filtered_total", top_k=10),
        "avg_language": merge_distributions_weighted(analyses, "language_distribution", "filtered_total", top_k=10),
        "avg_topics": merge_topics(analyses, "topic_labels", "filtered_total", top_k=10),
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    supabase.table("influencer_average_comment_analysis").upsert(
        payload, on_conflict="account_id,window"
    ).execute()


def main():
    account_ids = get_x_account_ids(limit=50)
    if not account_ids:
        print("No X accounts.")
        return

    for account_id in account_ids:
        post_ids = get_all_post_ids_for_account(account_id)
        analyses = get_post_analyses(post_ids)
        if not analyses:
            continue
        upsert_influencer_average(account_id, window_label="all_posts", analyses=analyses)
        print(f"[OK] aggregated account_id={account_id} posts={len(analyses)}")


if __name__ == "__main__":
    main()
