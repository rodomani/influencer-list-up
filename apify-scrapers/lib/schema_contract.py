from typing import Dict, Set


SCHEMA_CONTRACT: Dict[str, Set[str]] = {
    "sns_accounts": {
        "id",
        "platform",
        "platform_user_id",
        "platform_profile_id",
        "account_name",
        "account_url",
        "caption",
        "profile_image_url",
        "is_verified",
        "business_account",
        "country",
        "language",
        "keywords",
        "last_profile_scraped_at",
        "last_posts_scraped_at",
        "updated_at",
    },
    "accounts_metrics": {
        "account_id",
        "metric_date",
        "followers",
        "following",
        "posts",
        "maximum_likes",
        "created_at",
    },
    "analysis_job_runs": {
        "id",
        "analysis_name",
        "account_id",
        "platform",
        "status",
        "rows_written",
        "error_message",
        "details",
        "analysis_version",
        "started_at",
        "finished_at",
        "created_at",
    },
    "influencer_growth_anomaly_summary": {
        "account_id",
        "platform",
        "window_label",
        "growth_anomaly_score",
        "analysis_status",
        "analysis_version",
        "updated_at",
    },
    "influencer_performance_summary": {
        "account_id",
        "window",
        "engagement_trend_score",
        "updated_at",
    },
    "influencer_commenter_quality_summary": {
        "account_id",
        "platform",
        "window_label",
        "avg_unique_commenters",
        "updated_at",
    },
    "analysis_unique_indexes": {
        "table_name",
        "tablename",
        "index_name",
        "indexname",
        "indexdef",
    },
}


def contract_columns(table: str) -> Set[str]:
    return set(SCHEMA_CONTRACT.get(table, set()))
