# Bookmarked influencer weekly refresh

Run this script on a schedule:

```bash
python apify-scrapers/bookmarked_weekly_refresh.py
```

What it does:

- finds `sns_accounts` rows with at least one bookmark
- checks `influencer_average_comment_analysis.updated_at` for `window = all_posts`
- if that account has not been refreshed within `BOOKMARK_ANALYSIS_REFRESH_HOURS` (default `168`), it:
  - fetches recent posts for that influencer
  - runs comment analysis on recent posts
  - refreshes `influencer_average_comment_analysis`

Useful env vars:

- `BOOKMARK_ANALYSIS_REFRESH_HOURS` default `168`
- `BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT` default `20`
- `BOOKMARK_MAX_ACCOUNTS_PER_RUN` default `200`
- `BOOKMARK_ACCOUNT_BATCH_SIZE` default `100`
- `BOOKMARK_PLATFORMS` default `instagram,tiktok,youtube,x`

Recommended scheduling:

- run the script daily from cron / launchd / GitHub Actions
- let the script decide whether each bookmarked influencer is due
