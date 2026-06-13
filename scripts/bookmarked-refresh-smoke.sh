#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PYTHON_BIN="${PYTHON_BIN:-.venv/bin/python}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Python interpreter not found or not executable: $PYTHON_BIN" >&2
  echo "Create/activate the project virtualenv, or set PYTHON_BIN to a valid interpreter." >&2
  exit 1
fi

export BOOKMARK_PLATFORMS="${BOOKMARK_PLATFORMS:-instagram}"
export BOOKMARK_ANALYSIS_REFRESH_HOURS="${BOOKMARK_ANALYSIS_REFRESH_HOURS:-0}"
export BOOKMARK_MAX_ACCOUNTS_PER_RUN="${BOOKMARK_MAX_ACCOUNTS_PER_RUN:-1}"
export BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT="${BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT:-3}"
export BOOKMARK_SLEEP_SECONDS="${BOOKMARK_SLEEP_SECONDS:-0}"

echo "Running bookmarked refresh smoke:"
echo "  BOOKMARK_PLATFORMS=$BOOKMARK_PLATFORMS"
echo "  BOOKMARK_ANALYSIS_REFRESH_HOURS=$BOOKMARK_ANALYSIS_REFRESH_HOURS"
echo "  BOOKMARK_MAX_ACCOUNTS_PER_RUN=$BOOKMARK_MAX_ACCOUNTS_PER_RUN"
echo "  BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT=$BOOKMARK_ANALYZE_POSTS_PER_ACCOUNT"
echo "  BOOKMARK_SLEEP_SECONDS=$BOOKMARK_SLEEP_SECONDS"

exec "$PYTHON_BIN" apify-scrapers/bookmarked_weekly_refresh.py
