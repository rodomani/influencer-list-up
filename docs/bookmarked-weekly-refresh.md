# Bookmarked influencer weekly refresh

Use this script as the normal backend entrypoint for bookmarked influencer refreshes:

```bash
python3 apify-scrapers/bookmarked_weekly_refresh.py
```

Avoid running platform-specific analyzer scripts during the normal workflow. Those scripts are useful for debugging one platform, but the weekly refresh coordinates the full end-to-end pipeline and records run status in `analysis_job_runs`.

## What it does

- finds distinct bookmarked accounts from `user_bookmarks`
- filters to supported platforms from `BOOKMARK_PLATFORMS`
- checks recent non-failed entries in `analysis_job_runs`
- if any required analysis is stale by `BOOKMARK_ANALYSIS_REFRESH_HOURS`, it refreshes that account
- fetches recent posts for the influencer
- runs post comment ingestion and post comment analysis
- runs post commenter quality analysis
- runs post sponsorship analysis
- refreshes account-level comment averages
- refreshes commenter quality, growth anomaly, and performance summaries
- writes step-level success, skipped, partial, and failed statuses to `analysis_job_runs`

## Tables populated

A clean run should populate or refresh these tables:

- `post_comment_analysis`
- `post_comments_raw`
- `post_commenter_quality_analysis`
- `post_sponsorship_analysis`
- `influencer_average_comment_analysis`
- `influencer_commenter_quality_summary`
- `influencer_growth_anomaly_summary`
- `influencer_performance_summary`
- `analysis_job_runs`

`influencer_growth_anomaly_summary.analysis_status` may be `insufficient_history`, `no_metrics`, or `stale_source_data`. Those are expected non-crash states when source metric history is not ready yet.

## Useful env vars

- `BOOKMARK_ANALYSIS_REFRESH_HOURS` default `168`
- `BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT` default `20`
- `BOOKMARK_MAX_ACCOUNTS_PER_RUN` default `200`
- `BOOKMARK_ACCOUNT_BATCH_SIZE` default `100`
- `BOOKMARK_SLEEP_SECONDS` default `0.2`
- `BOOKMARK_MIN_POST_SUCCESS_RATE` default `0.8`
- `BOOKMARK_PLATFORMS` default `instagram,tiktok,youtube,x`
- `BOOKMARK_ACCOUNT_IDS` optional comma-separated account ids, bypasses the bookmarked-account query
- `DEBUG_TIMERS` optional `1` to print TikTok analyzer `[TIMER]` logs

Small smoke run:

```bash
npm run smoke:bookmarked-refresh
```

Force a due check during testing:

```bash
BOOKMARK_ANALYSIS_REFRESH_HOURS=0 \
BOOKMARK_MAX_ACCOUNTS_PER_RUN=1 \
BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT=3 \
BOOKMARK_SLEEP_SECONDS=0 \
.venv/bin/python apify-scrapers/bookmarked_weekly_refresh.py
```

Run one exact account:

```bash
BOOKMARK_ACCOUNT_IDS=1374 \
BOOKMARK_ANALYSIS_REFRESH_HOURS=0 \
BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT=3 \
BOOKMARK_SLEEP_SECONDS=0 \
.venv/bin/python apify-scrapers/bookmarked_weekly_refresh.py
```

Test one platform:

```bash
BOOKMARK_PLATFORMS=instagram \
BOOKMARK_ANALYSIS_REFRESH_HOURS=0 \
BOOKMARK_MAX_ACCOUNTS_PER_RUN=1 \
BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT=3 \
BOOKMARK_SLEEP_SECONDS=0 \
.venv/bin/python apify-scrapers/bookmarked_weekly_refresh.py
```

## SQL verification

Run these checks in the Supabase SQL Editor after a refresh.

Recent run status:

```sql
select
  analysis_name,
  platform,
  status,
  count(*) as runs,
  max(finished_at) as latest_run
from public.analysis_job_runs
where finished_at > now() - interval '24 hours'
group by analysis_name, platform, status
order by latest_run desc;
```

Latest failed steps:

```sql
select
  finished_at,
  analysis_name,
  account_id,
  platform,
  status,
  rows_written,
  left(error_message, 300) as error
from public.analysis_job_runs
where status = 'failed'
order by finished_at desc
limit 20;
```

Output table counts:

```sql
select 'post_comment_analysis' as table_name, count(*) from public.post_comment_analysis
union all select 'post_comments_raw', count(*) from public.post_comments_raw
union all select 'post_commenter_quality_analysis', count(*) from public.post_commenter_quality_analysis
union all select 'post_sponsorship_analysis', count(*) from public.post_sponsorship_analysis
union all select 'influencer_average_comment_analysis', count(*) from public.influencer_average_comment_analysis
union all select 'influencer_commenter_quality_summary', count(*) from public.influencer_commenter_quality_summary
union all select 'influencer_growth_anomaly_summary', count(*) from public.influencer_growth_anomaly_summary
union all select 'influencer_performance_summary', count(*) from public.influencer_performance_summary;
```

## Bookmark source of truth

- `user_bookmarks` is the bookmark source of truth.
- The refresh job deduplicates multiple users bookmarking the same `sns_accounts` row.
- `BOOKMARK_ACCOUNT_IDS` still lets you bypass bookmark selection and target exact account ids.

## Troubleshooting

- `No bookmarked influencers are due for weekly refresh.` means the freshness gate found recent non-failed analysis runs.
- `PGRST205` usually means Supabase REST schema cache or a table name mismatch. Confirm the table exists, then run `notify pgrst, 'reload schema';` in Supabase SQL Editor.
- Apify read timeouts or connection resets are source/API runtime failures. Reduce `BOOKMARK_MAX_ACCOUNTS_PER_RUN` and `BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT`, then retry.
- If aggregates are skipped because post analysis failed too often, lower the test size first. Only adjust `BOOKMARK_MIN_POST_SUCCESS_RATE` if you explicitly accept partial data.

## Recommended scheduling

Run the script daily from cron, launchd, GitHub Actions, or another scheduler:

```bash
python3 apify-scrapers/bookmarked_weekly_refresh.py
```

Daily scheduling is preferred even though the refresh interval defaults to weekly. The script decides which accounts are due, and failed or timed-out accounts get another chance on the next scheduled run.
