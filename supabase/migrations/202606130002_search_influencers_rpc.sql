create or replace view public.latest_account_metrics as
select distinct on (account_id)
  account_id,
  followers,
  posts,
  maximum_likes,
  metric_date
from public.accounts_metrics
order by account_id, metric_date desc;

create or replace view public.influencer_latest_activity as
select
  account_id,
  max(posted_at) as latest_posted_at,
  greatest(max(posted_at), max(scraped_at)) as latest_activity_at,
  min(posted_at) as first_posted_at
from public.posts
group by account_id;

create index if not exists accounts_metrics_account_metric_date_idx
  on public.accounts_metrics (account_id, metric_date desc);

create index if not exists posts_account_posted_scraped_idx
  on public.posts (account_id, posted_at desc, scraped_at desc);

create or replace function public.search_influencers(
  p_platforms text[] default null,
  p_username text default null,
  p_keywords text[] default null,
  p_min_followers bigint default null,
  p_max_followers bigint default null,
  p_min_likes bigint default null,
  p_max_likes bigint default null,
  p_min_posts bigint default null,
  p_max_posts bigint default null,
  p_sort text default 'recommended',
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  id bigint,
  platform text,
  account_name text,
  gender text,
  keywords text,
  profile_image_url text,
  followers bigint,
  posts bigint,
  maximum_likes bigint,
  metric_date date,
  latest_posted_at timestamp without time zone,
  latest_activity_at timestamp without time zone,
  first_posted_at timestamp without time zone,
  posting_span_days integer,
  bookmark_count bigint,
  total_count bigint
)
language sql
stable
as $$
  with filtered as (
    select
      sa.id,
      sa.platform,
      sa.account_name,
      sa.gender,
      sa.keywords,
      sa.profile_image_url,
      lam.followers,
      lam.posts,
      lam.maximum_likes,
      lam.metric_date,
      ila.latest_posted_at,
      ila.latest_activity_at,
      ila.first_posted_at,
      case
        when ila.first_posted_at is not null and ila.latest_posted_at is not null
          then greatest((ila.latest_posted_at::date - ila.first_posted_at::date), 0)
        else null
      end as posting_span_days,
      coalesce(ub_counts.bookmark_count, 0) as bookmark_count
    from public.sns_accounts sa
    left join public.latest_account_metrics lam
      on lam.account_id = sa.id
    left join public.influencer_latest_activity ila
      on ila.account_id = sa.id
    left join (
      select
        account_id,
        count(*)::bigint as bookmark_count
      from public.user_bookmarks
      group by account_id
    ) ub_counts
      on ub_counts.account_id = sa.id
    where
      (coalesce(array_length(p_platforms, 1), 0) = 0 or sa.platform = any(p_platforms))
      and (p_username is null or btrim(p_username) = '' or sa.account_name ilike '%' || btrim(p_username) || '%')
      and (
        coalesce(array_length(p_keywords, 1), 0) = 0
        or exists (
          select 1
          from unnest(p_keywords) as keyword
          where sa.keywords ilike '%' || keyword || '%'
        )
      )
      and (p_min_followers is null or coalesce(lam.followers, 0) >= p_min_followers)
      and (p_max_followers is null or coalesce(lam.followers, 0) <= p_max_followers)
      and (p_min_likes is null or coalesce(lam.maximum_likes, 0) >= p_min_likes)
      and (p_max_likes is null or coalesce(lam.maximum_likes, 0) <= p_max_likes)
      and (p_min_posts is null or coalesce(lam.posts, 0) >= p_min_posts)
      and (p_max_posts is null or coalesce(lam.posts, 0) <= p_max_posts)
  ),
  counted as (
    select
      filtered.*,
      count(*) over() as total_count
    from filtered
  )
  select
    id,
    platform,
    account_name,
    gender,
    keywords,
    profile_image_url,
    followers,
    posts,
    maximum_likes,
    metric_date,
    latest_posted_at,
    latest_activity_at,
    first_posted_at,
    posting_span_days,
    bookmark_count,
    total_count
  from counted
  order by
    case when p_sort = 'followers_desc' then followers end desc nulls last,
    case when p_sort = 'followers_asc' then followers end asc nulls last,
    case when p_sort = 'posts_desc' then posts end desc nulls last,
    case when p_sort = 'posts_asc' then posts end asc nulls last,
    case when p_sort = 'likes_desc' then maximum_likes end desc nulls last,
    case when p_sort = 'likes_asc' then maximum_likes end asc nulls last,
    case
      when p_sort = 'engagement_rate_desc'
        then case
          when coalesce(followers, 0) > 0
            then coalesce(maximum_likes, 0)::numeric / followers::numeric
          else 0
        end
    end desc nulls last,
    case
      when p_sort = 'posting_frequency_desc'
        then case
          when coalesce(posting_span_days, 0) > 0
            then coalesce(posts, 0)::numeric / posting_span_days::numeric
          else 0
        end
    end desc nulls last,
    case when p_sort = 'latest_post_desc' then latest_posted_at end desc nulls last,
    case when p_sort = 'latest_post_asc' then latest_posted_at end asc nulls last,
    case when p_sort = 'latest_activity_desc' then latest_activity_at end desc nulls last,
    case when p_sort = 'metric_date_desc' then metric_date end desc nulls last,
    case when p_sort = 'posting_span_desc' then posting_span_days end desc nulls last,
    case when p_sort = 'posting_span_asc' then posting_span_days end asc nulls last,
    case when p_sort = 'bookmarks_desc' then bookmark_count end desc nulls last,
    case
      when p_sort = 'keyword_count_desc'
        then cardinality(
          array_remove(
            regexp_split_to_array(coalesce(keywords, ''), '\s*,\s*'),
            ''
          )
        )
    end desc nulls last,
    case when p_sort = 'name_asc' then lower(account_name) end asc nulls last,
    case when p_sort = 'recommended' then latest_activity_at end desc nulls last,
    case when p_sort = 'recommended' then followers end desc nulls last,
    id asc
  limit greatest(coalesce(p_limit, 10), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
