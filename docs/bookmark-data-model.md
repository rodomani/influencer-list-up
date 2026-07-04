# Bookmark Data Model

## Source of Truth

Bookmarks are stored in `user_bookmarks`.

- one row per `user_id + account_id`
- bookmark metadata lives on the same row
- the bookmark page joins `user_bookmarks.account_id` to `sns_accounts.id`

Core fields:

- `priority`
- `personal_rating`
- `candidate_readiness`
- `risk_level`
- `risk_notes`
- `estimated_price_min`
- `estimated_price_max`
- `price_note`
- `price_checked_at`
- `contact_info`
- `saved_snapshot`
- `research_checklist`
- `saved_reason`
- `private_memo`
- `saved_source`
- `saved_source_detail`

## Folder And Tag Model

Folders and tags do not point directly to `sns_accounts`.

- `bookmark_folders` belongs to a user
- `bookmark_tags` belongs to a user
- `bookmark_folder_items.bookmark_id` points to `user_bookmarks.id`
- `bookmark_tag_items.bookmark_id` points to `user_bookmarks.id`

That means a folder or tag assignment is user-specific and bookmark-row-specific.

## Source Metadata

Source information is stored on `user_bookmarks`.

- `saved_source`: simple source label such as search result or manual save
- `saved_source_detail`: JSON payload for richer context
- `saved_reason`: why the user saved the account
- `private_memo`: private freeform note

## Saved Snapshots

`saved_snapshot` is JSON metadata captured at save time.

Typical fields:

- `followers`
- `posts`
- `maximumLikes`
- `metricDate`
- `savedAt`

This lets the bookmark UI compare saved-time metrics with current metrics.

## Migration From Legacy Bookmark Storage

Old code paths treated `sns_accounts.bookmarks` as bookmark storage.

Current model:

1. user clicks bookmark
2. frontend upserts `user_bookmarks`
3. bookmark page queries `user_bookmarks` and joins `sns_accounts`
4. refresh jobs read bookmarked accounts from `user_bookmarks`

Legacy fields should not be used as the product source of truth anymore.

## Python Refresh Query

The refresh pipeline should read bookmarked accounts from `user_bookmarks`.

Recommended SQL view:

```sql
create or replace view public.bookmarked_accounts_for_refresh as
select
  ub.user_id,
  ub.created_at as bookmarked_at,
  sa.*
from public.user_bookmarks ub
join public.sns_accounts sa on sa.id = ub.account_id;
```

Then Python can read from `bookmarked_accounts_for_refresh` instead of any legacy bookmark field on `sns_accounts`.
