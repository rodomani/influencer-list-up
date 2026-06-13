# Regression Checks

Use these checks before committing or deploying changes.

## Local Check

Run the local regression check from the repo root:

```bash
npm run check
```

This runs:

- `npm --prefix frontend-influencer run lint`
- `npm --prefix frontend-influencer run build`
- `python3 -m compileall -q apify-scrapers`

## Frontend Only

```bash
npm run check:frontend
```

Use this when a change only touches React, CSS, frontend config, or frontend dependencies.

## Python Syntax Only

```bash
npm run check:python
```

Use this for scraper and analysis script edits that do not need a remote smoke run.

## Bookmarked Refresh Smoke

Run this after Supabase migrations, scraper changes, analysis changes, or database contract changes:

```bash
npm run smoke:bookmarked-refresh
```

The smoke wrapper defaults to:

- `BOOKMARK_PLATFORMS=instagram`
- `BOOKMARK_ANALYSIS_REFRESH_HOURS=0`
- `BOOKMARK_MAX_ACCOUNTS_PER_RUN=1`
- `BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT=3`
- `BOOKMARK_SLEEP_SECONDS=0`
- `PYTHON_BIN=.venv/bin/python`

Override any value inline:

```bash
BOOKMARK_PLATFORMS=youtube \
BOOKMARK_ACCOUNT_IDS=1392 \
npm run smoke:bookmarked-refresh
```

This command talks to Supabase and platform/Apify APIs. It requires valid values in `apify-scrapers/.env` and may consume external API/runtime.

## Smoke Verification

After the smoke run, check `analysis_job_runs` for the account that ran. A healthy run should include recent rows for:

- `refresh_posts`
- `post_comment_analysis`
- `post_sponsorship`
- `commenter_quality`
- `commenter_quality_summary`
- `account_comment_average`
- `growth_anomaly`
- `performance_summary`

Expected non-crash growth statuses can include:

- `stale_source_data`
- `no_metrics`
- `insufficient_history`

Treat `failed` rows as blockers unless the failure is an expected third-party timeout that you intentionally retry.
