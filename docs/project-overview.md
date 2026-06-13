# Project Overview

## Purpose

Influencer List Up is an influencer discovery and campaign management app. It helps marketers find creators across social platforms, review profile and engagement signals, bookmark promising accounts, and organize creators into campaigns.

The backend also runs scheduled scraping and analysis jobs so bookmarked influencers stay fresh without requiring users to manually run each platform-specific script.

## Primary Users

- Marketers and campaign operators who need to discover influencers by platform, keyword, follower count, post count, and likes.
- Campaign managers who need to group selected influencers into campaigns and track campaign metadata.
- Operators or developers who maintain the scraper and analysis pipeline.

## Main Product Areas

### Influencer Discovery

- Search influencers from `sns_accounts`.
- Filter by platform, username, keywords, likes, posts, followers, and optional campaign context.
- View detailed influencer profiles with latest metrics from `accounts_metrics`.
- Review account-level comment analysis from `influencer_average_comment_analysis`.

### Bookmarks

- Users can bookmark influencers directly from search results or the bookmark screen.
- Bookmarks are stored on `sns_accounts.bookmarks` as user id values.
- Bookmarked accounts are the normal input set for the weekly refresh pipeline.

### Campaigns

- Users can create, list, edit, and inspect campaigns.
- Campaign records live in `campaigns` and are scoped by `user_id`.
- Search results can append an influencer account name to a selected campaign.

### Authentication and Profiles

- The frontend uses Supabase Auth.
- User profile data is stored in `users`.
- Email verification status is mirrored to `users.email_verified`.
- Supabase Edge Functions handle profile upsert and some campaign operations.

### Scraping and Analysis

- Python jobs under `apify-scrapers/` ingest accounts, posts, metrics, comments, hashtags, and analysis outputs.
- Supported platforms are Instagram, TikTok, YouTube, and X.
- `apify-scrapers/bookmarked_weekly_refresh.py` is the normal backend entrypoint for bookmarked influencer refreshes.
- The refresh pipeline records step status in `analysis_job_runs`.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/Radix UI style components
- Supabase JS client
- Firebase Hosting for static deployment

### Backend

- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions
- Supabase Storage for profile images
- Python scraper and analysis scripts
- Apify actors for supported scraping workflows
- YouTube API for YouTube ingestion

## Current Operational Entry Points

Frontend development:

```bash
cd frontend-influencer
npm run dev
```

Frontend verification:

```bash
cd frontend-influencer
npm run lint
npm run build
```

Bookmarked influencer refresh:

```bash
.venv/bin/python apify-scrapers/bookmarked_weekly_refresh.py
```

Small smoke refresh:

```bash
BOOKMARK_PLATFORMS=instagram \
BOOKMARK_ANALYSIS_REFRESH_HOURS=0 \
BOOKMARK_MAX_ACCOUNTS_PER_RUN=1 \
BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT=3 \
BOOKMARK_SLEEP_SECONDS=0 \
.venv/bin/python apify-scrapers/bookmarked_weekly_refresh.py
```
