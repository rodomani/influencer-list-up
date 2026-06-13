import { supabase } from "@/lib/supabase";
import type {
  AccountMetricTrendRow,
  InfluencerAverageCommentAnalysis,
  InfluencerDetail,
  PostActivityRow,
  RefreshJobRun,
  SimilarInfluencerRow,
} from "../types";

export const fetchInfluencerDetail = async (influencerId: number) => {
  const { data, error } = await supabase
    .from("sns_accounts")
    .select(
      `
      id,
      platform,
      account_name,
      account_url,
      caption,
      profile_image_url,
      gender,
      keywords,
      last_profile_scraped_at,
      accounts_metrics(maximum_likes, posts, followers, metric_date)
    `
    )
    .eq("id", influencerId)
    .order("metric_date", {
      foreignTable: "accounts_metrics",
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as InfluencerDetail | null) ?? null;
};

export const fetchMetricTrend = async (accountId: number) => {
  const { data, error } = await supabase
    .from("accounts_metrics")
    .select("metric_date, followers, posts, maximum_likes")
    .eq("account_id", accountId)
    .order("metric_date", { ascending: true });

  if (error) throw error;
  return (data as AccountMetricTrendRow[]) ?? [];
};

export const fetchAverageCommentAnalysis = async (accountId: number) => {
  const { data, error } = await supabase
    .from("influencer_average_comment_analysis")
    .select(
      `
      account_id,
      window,
      posts_count,
      avg_sentiment,
      avg_toxicity,
      avg_hate_score,
      avg_conversion_intent_rate,
      avg_spam_rate,
      sum_sampled_total,
      sum_filtered_total,
      avg_emotion,
      avg_language,
      avg_topics,
      updated_at
    `
    )
    .eq("account_id", accountId)
    .eq("window", "all_posts")
    .maybeSingle();

  if (error) throw error;
  return (data as InfluencerAverageCommentAnalysis | null) ?? null;
};

export const fetchPostActivityRows = async (accountId: number) => {
  const { data, error } = await supabase
    .from("posts")
    .select("posted_at, scraped_at")
    .eq("account_id", accountId);

  if (error) throw error;
  return (data as PostActivityRow[]) ?? [];
};

export const fetchSimilarInfluencers = async (influencer: InfluencerDetail, influencerId: number) => {
  const { data, error } = await supabase
    .from("sns_accounts")
    .select(
      `
      id,
      platform,
      keywords,
      accounts_metrics(maximum_likes, posts, followers, metric_date)
    `
    )
    .eq("platform", influencer.platform)
    .neq("id", influencerId)
    .order("metric_date", {
      foreignTable: "accounts_metrics",
      ascending: false,
    })
    .limit(100);

  if (error) throw error;
  return (data as SimilarInfluencerRow[]) ?? [];
};

export const fetchPostsForAccounts = async (accountIds: number[]) => {
  if (accountIds.length === 0) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("account_id, posted_at, scraped_at")
    .in("account_id", accountIds);

  if (error) throw error;
  return (data as Array<PostActivityRow & { account_id: number }>) ?? [];
};

export const fetchAnalysisForAccounts = async (accountIds: number[]) => {
  if (accountIds.length === 0) return [];
  const { data, error } = await supabase
    .from("influencer_average_comment_analysis")
    .select(
      `
      account_id,
      window,
      posts_count,
      avg_sentiment,
      avg_toxicity,
      avg_hate_score,
      avg_conversion_intent_rate,
      avg_spam_rate,
      sum_sampled_total,
      sum_filtered_total,
      avg_emotion,
      avg_language,
      avg_topics,
      updated_at
    `
    )
    .in("account_id", accountIds)
    .eq("window", "all_posts");

  if (error) throw error;
  return (data as InfluencerAverageCommentAnalysis[]) ?? [];
};

export const fetchLatestRefreshJob = async (accountId: number) => {
  const { data, error } = await supabase
    .from("analysis_job_runs")
    .select("id, status, rows_written, error_message, details, started_at, finished_at, created_at")
    .eq("analysis_name", "single_influencer_refresh")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as RefreshJobRun | null) ?? null;
};

export const requestInfluencerRefresh = async (accountId: number) =>
  supabase.functions.invoke("single-influencer-refresh", {
    body: {
      account_id: accountId,
      include_posts: true,
    },
  });
