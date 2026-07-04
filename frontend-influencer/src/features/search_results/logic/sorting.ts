import type { InfluencerNormalized, SortOption } from "../types";
import { engagementRate, keywordCount, metricNumber, timestampToMs } from "./formatters";

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "recommended", label: "おすすめ順" },
  { value: "followers_desc", label: "フォロワー数が多い順" },
  { value: "followers_asc", label: "フォロワー数が少ない順" },
  { value: "posts_desc", label: "投稿数が多い順" },
  { value: "posts_asc", label: "投稿数が少ない順" },
  { value: "likes_desc", label: "最大いいね数が多い順" },
  { value: "likes_asc", label: "最大いいね数が少ない順" },
  { value: "engagement_rate_desc", label: "反応率が高い順" },
  { value: "latest_post_desc", label: "最新投稿日が新しい順" },
  { value: "latest_post_asc", label: "最新投稿日が古い順" },
  { value: "latest_activity_desc", label: "最新アクティビティが新しい順" },
  { value: "metric_date_desc", label: "指標データが新しい順" },
  { value: "posting_span_desc", label: "投稿継続期間が長い順" },
  { value: "posting_span_asc", label: "投稿継続期間が短い順" },
  { value: "bookmarks_desc", label: "保存数が多い順" },
  { value: "keyword_count_desc", label: "キーワードが多い順" },
  { value: "name_asc", label: "アカウント名順" },
];

const freshnessScore = (timestamp?: string | null) => {
  const activityMs = timestampToMs(timestamp);
  if (activityMs <= 0) return 0;

  const ageDays = (Date.now() - activityMs) / (1000 * 60 * 60 * 24);
  return 1 / (1 + Math.max(0, ageDays));
};

const recommendationScore = (influencer: InfluencerNormalized) => {
  const metrics = influencer.accounts_metrics;
  const followers = metricNumber(metrics?.followers);
  const maximumLikes = metricNumber(metrics?.maximum_likes);
  const engagement = engagementRate(metrics);
  const bookmarks = influencer.bookmark_count ?? 0;
  const keywordMatches = keywordCount(influencer.keywords);

  const followersScore = Math.log10(followers + 1);
  const likesScore = Math.log10(maximumLikes + 1);
  const engagementScore = Math.min(engagement, 20) / 20;
  const savedScore = Math.log10(bookmarks + 1);
  const keywordScore = Math.min(keywordMatches, 5) / 5;
  const recentActivityScore = freshnessScore(
    influencer.latest_activity_at ?? influencer.latest_posted_at ?? metrics?.metric_date
  );

  return (
    followersScore * 0.3 +
    likesScore * 0.15 +
    engagementScore * 0.25 +
    recentActivityScore * 0.2 +
    savedScore * 0.05 +
    keywordScore * 0.05
  );
};

export const sortInfluencers = (influencers: InfluencerNormalized[], sortOption: SortOption) => {
  const withIndex = influencers.map((influencer, index) => ({ influencer, index }));
  const byOriginalOrder = (a: { index: number }, b: { index: number }) => a.index - b.index;

  withIndex.sort((a, b) => {
    const aMetrics = a.influencer.accounts_metrics;
    const bMetrics = b.influencer.accounts_metrics;

    switch (sortOption) {
      case "followers_desc":
        return metricNumber(bMetrics?.followers) - metricNumber(aMetrics?.followers) || byOriginalOrder(a, b);
      case "followers_asc":
        return metricNumber(aMetrics?.followers) - metricNumber(bMetrics?.followers) || byOriginalOrder(a, b);
      case "posts_desc":
        return metricNumber(bMetrics?.posts) - metricNumber(aMetrics?.posts) || byOriginalOrder(a, b);
      case "posts_asc":
        return metricNumber(aMetrics?.posts) - metricNumber(bMetrics?.posts) || byOriginalOrder(a, b);
      case "likes_desc":
        return metricNumber(bMetrics?.maximum_likes) - metricNumber(aMetrics?.maximum_likes) || byOriginalOrder(a, b);
      case "likes_asc":
        return metricNumber(aMetrics?.maximum_likes) - metricNumber(bMetrics?.maximum_likes) || byOriginalOrder(a, b);
      case "engagement_rate_desc":
        return engagementRate(bMetrics) - engagementRate(aMetrics) || byOriginalOrder(a, b);
      case "latest_post_desc":
        return timestampToMs(b.influencer.latest_posted_at) - timestampToMs(a.influencer.latest_posted_at) || byOriginalOrder(a, b);
      case "latest_post_asc":
        return timestampToMs(a.influencer.latest_posted_at) - timestampToMs(b.influencer.latest_posted_at) || byOriginalOrder(a, b);
      case "latest_activity_desc":
        return timestampToMs(b.influencer.latest_activity_at) - timestampToMs(a.influencer.latest_activity_at) || byOriginalOrder(a, b);
      case "metric_date_desc":
        return timestampToMs(bMetrics?.metric_date) - timestampToMs(aMetrics?.metric_date) || byOriginalOrder(a, b);
      case "posting_span_desc":
        return (b.influencer.posting_span_days ?? 0) - (a.influencer.posting_span_days ?? 0) || byOriginalOrder(a, b);
      case "posting_span_asc":
        return (a.influencer.posting_span_days ?? 0) - (b.influencer.posting_span_days ?? 0) || byOriginalOrder(a, b);
      case "bookmarks_desc":
        return (
          (b.influencer.bookmark_count ?? 0) - (a.influencer.bookmark_count ?? 0) ||
          byOriginalOrder(a, b)
        );
      case "keyword_count_desc":
        return keywordCount(b.influencer.keywords) - keywordCount(a.influencer.keywords) || byOriginalOrder(a, b);
      case "name_asc":
        return a.influencer.account_name.localeCompare(b.influencer.account_name, "ja") || byOriginalOrder(a, b);
      case "recommended":
      default:
        return recommendationScore(b.influencer) - recommendationScore(a.influencer) || byOriginalOrder(a, b);
    }
  });

  return withIndex.map(({ influencer }) => influencer);
};
