alter table public.campaign_influencers
  drop constraint if exists campaign_influencers_quoted_price_nonnegative;

alter table public.campaign_influencers
  add constraint campaign_influencers_quoted_price_nonnegative
  check (quoted_price is null or quoted_price >= 0) not valid;

alter table public.campaign_calendar_events
  drop constraint if exists campaign_calendar_events_event_type_check;

alter table public.campaign_calendar_events
  add constraint campaign_calendar_events_event_type_check
  check (event_type in ('campaign', 'review', 'influencer', 'deliverable', 'task', 'custom')) not valid;

create or replace function public.recommend_influencers_for_campaign(
  p_campaign_id bigint,
  p_goal text default null,
  p_budget numeric default null,
  p_excluded_account_ids bigint[] default null,
  p_limit integer default 6
)
returns table (
  id bigint,
  platform text,
  account_name text,
  profile_image_url text,
  gender text,
  keywords text,
  followers bigint,
  posts bigint,
  maximum_likes bigint,
  metric_date date,
  recommendation_score integer,
  recommendation_reasons jsonb
)
language sql
stable
as $$
  with campaign_context as (
    select
      c.id,
      c.user_id,
      coalesce(nullif(btrim(p_goal), ''), nullif(btrim(c.goal), ''), '') as goal_text,
      coalesce(p_budget, c.budget) as budget_value
    from public.campaigns c
    where c.id = p_campaign_id
  ),
  goal_terms as (
    select
      cc.id as campaign_id,
      regexp_split_to_array(lower(cc.goal_text), '\s+|,\s*|、|/|・') as terms
    from campaign_context cc
  ),
  excluded as (
    select unnest(coalesce(p_excluded_account_ids, array[]::bigint[])) as account_id
  ),
  candidate_pool as (
    select
      sa.id,
      sa.platform,
      sa.account_name,
      sa.profile_image_url,
      sa.gender,
      sa.keywords,
      lam.followers,
      lam.posts,
      lam.maximum_likes,
      lam.metric_date,
      ila.latest_posted_at,
      ila.latest_activity_at,
      analysis.avg_sentiment,
      analysis.avg_toxicity,
      analysis.avg_spam_rate,
      ub.risk_level,
      ub.estimated_price_min,
      ub.estimated_price_max,
      cc.goal_text,
      cc.budget_value,
      case
        when lam.followers is not null and lam.followers > 0 and lam.maximum_likes is not null
          then lam.maximum_likes::numeric / lam.followers::numeric
        else 0
      end as engagement_rate,
      case
        when cc.goal_text = '' then 0::numeric
        else (
          select count(*)::numeric
          from unnest(gt.terms) as term
          where length(term) > 1
            and lower(coalesce(sa.keywords, '') || ' ' || coalesce(sa.account_name, '')) like '%' || term || '%'
        )
      end as goal_match_count
    from public.sns_accounts sa
    join campaign_context cc on true
    join goal_terms gt on gt.campaign_id = cc.id
    left join public.latest_account_metrics lam
      on lam.account_id = sa.id
    left join public.influencer_latest_activity ila
      on ila.account_id = sa.id
    left join public.influencer_average_comment_analysis analysis
      on analysis.account_id = sa.id
     and analysis.window = 'all_posts'
    left join public.user_bookmarks ub
      on ub.account_id = sa.id
     and ub.user_id = cc.user_id
    where not exists (
      select 1
      from excluded e
      where e.account_id = sa.id
    )
  ),
  scored as (
    select
      cp.*,
      (
        least(1, ln(coalesce(cp.followers, 0) + 1) / nullif(ln(500000 + 1), 0)) * 24
        + least(1, ln(coalesce(cp.maximum_likes, 0) + 1) / nullif(ln(50000 + 1), 0)) * 16
        + least(1, cp.engagement_rate / 0.08) * 12
        + case
            when cp.latest_activity_at is null then 0
            when cp.latest_activity_at >= now() - interval '14 days' then 12
            when cp.latest_activity_at >= now() - interval '30 days' then 9
            when cp.latest_activity_at >= now() - interval '60 days' then 6
            else 2
          end
        + case
            when coalesce(cp.avg_toxicity, 0) <= 0.1 and coalesce(cp.avg_spam_rate, 0) <= 0.1 then 10
            when coalesce(cp.avg_toxicity, 0) <= 0.2 and coalesce(cp.avg_spam_rate, 0) <= 0.2 then 7
            else 3
          end
        + case
            when cp.goal_match_count >= 3 then 12
            when cp.goal_match_count = 2 then 9
            when cp.goal_match_count = 1 then 6
            else 0
          end
        + case
            when cp.budget_value is null then 0
            when cp.estimated_price_max is null then 2
            when cp.estimated_price_max <= cp.budget_value then 8
            when cp.estimated_price_min is not null and cp.estimated_price_min <= cp.budget_value then 5
            else 0
          end
        + case coalesce(cp.risk_level, 'unknown')
            when 'low' then 6
            when 'medium' then 3
            when 'unknown' then 1
            else 0
          end
      ) as raw_score
    from candidate_pool cp
  )
  select
    s.id,
    s.platform,
    s.account_name,
    s.profile_image_url,
    s.gender,
    s.keywords,
    s.followers,
    s.posts,
    s.maximum_likes,
    s.metric_date,
    greatest(0, least(100, round(s.raw_score)))::integer as recommendation_score,
    to_jsonb(array_remove(array[
      case when s.goal_match_count > 0 then 'キャンペーン目標との一致度が高いです。' end,
      case when coalesce(s.followers, 0) >= 10000 then 'フォロワー規模が候補比較で強いです。' end,
      case when coalesce(s.maximum_likes, 0) > 0 then '反応率の見込みがあります。' end,
      case when s.latest_activity_at >= now() - interval '30 days' then '最近の活動が確認できます。' end,
      case when s.avg_toxicity is not null and s.avg_toxicity <= 0.15 then 'コメント品質が比較的安定しています。' end,
      case when s.budget_value is not null and s.estimated_price_max is not null and s.estimated_price_max <= s.budget_value then '予算感に収まりやすい候補です。' end,
      case when coalesce(s.risk_level, 'unknown') = 'low' then '保存済みリスク評価が低めです。' end
    ], null)) as recommendation_reasons
  from scored s
  where greatest(0, least(100, round(s.raw_score))) > 0
  order by s.raw_score desc, s.id asc
  limit greatest(coalesce(p_limit, 6), 1);
$$;
