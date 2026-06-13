# Developer Guide

## Directory Structure

- `frontend-influencer/`: React/Vite frontend.
- `frontend-influencer/src/pages/`: page-level UI for auth, home, search, bookmarks, and campaigns.
- `frontend-influencer/src/components/`: shared UI and app shell components.
- `frontend-influencer/src/lib/supabase.ts`: browser Supabase client.
- `frontend-influencer/src/contexts/AuthContext.tsx`: auth state and sign-in/out helpers.
- `supabase/functions/`: Supabase Edge Functions.
- `supabase/migrations/`: Supabase database migrations.
- `apify-scrapers/`: Python scraping, ingestion, and analysis jobs.
- `docs/`: project documentation.

## Frontend Setup

Install dependencies:

```bash
cd frontend-influencer
npm install
```

Create `frontend-influencer/.env` with the browser-safe Supabase values:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Run locally:

```bash
cd frontend-influencer
npm run dev
```

Verify before shipping:

```bash
npm run check
```

For frontend-only checks:

```bash
npm run check:frontend
```

The Vite build writes to `frontend-influencer/dist`, and `frontend-influencer/firebase.json` is configured to deploy that directory. See `docs/regression-checks.md` for the complete checklist.

## Supabase Setup

Link the project if needed:

```bash
supabase link --project-ref <project-ref>
```

Apply migrations:

```bash
supabase db push
```

Deploy an Edge Function:

```bash
supabase functions deploy <function-name> --no-verify-jwt
```

The current Edge Functions use Supabase service-role access internally where needed. Keep service-role keys in Supabase function secrets, never in frontend env files.

## Python Scraper Setup

Use the project virtualenv for scraper work:

```bash
source .venv/bin/activate
```

The backend scripts expect environment variables in `apify-scrapers/.env`, including:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_TOKEN`
- `YOUTUBE_API_KEY`

Run a syntax check:

```bash
python3 -m compileall -q apify-scrapers
```

Run the normal bookmarked refresh:

```bash
.venv/bin/python apify-scrapers/bookmarked_weekly_refresh.py
```

Run a one-account smoke refresh:

```bash
npm run smoke:bookmarked-refresh
```

## Development Notes

- Use `.venv/bin/python` for backend refresh jobs. The system Python may not have required ML/comment-analysis packages.
- Use `bookmarked_weekly_refresh.py` as the normal scheduled backend entrypoint.
- Use platform-specific scraper scripts only for debugging a single platform.
- After database migrations, run the smoke refresh and check `analysis_job_runs`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`, Apify tokens, or API keys in frontend code.
