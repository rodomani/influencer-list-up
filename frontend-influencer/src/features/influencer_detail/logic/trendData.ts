import type {
  AccountMetricTrendPoint,
  AccountMetricTrendRow,
  PostActivityRow,
  PostActivitySummary,
  PostActivityTrendPoint,
  TrendData,
} from "../types";
import { daysBetween, timestampToMs } from "./formatters";

export const emptyTrendData = (): TrendData => ({
  accountMetricTrend: [],
  postingActivityTrend: [],
});

export const normalizeMetricTrend = (rows: AccountMetricTrendRow[]): AccountMetricTrendPoint[] =>
  rows
    .filter((row) => Boolean(row.metric_date))
    .map((row) => ({
      date: row.metric_date ?? "",
      followers: Math.max(row.followers ?? 0, 0),
      posts: Math.max(row.posts ?? 0, 0),
      maximum_likes: Math.max(row.maximum_likes ?? 0, 0),
    }))
    .sort((a, b) => timestampToMs(a.date) - timestampToMs(b.date));

export const monthKey = (value: string | null | undefined) => {
  const time = timestampToMs(value);
  if (time === Number.NEGATIVE_INFINITY) return null;
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const buildPostingActivityTrend = (posts: PostActivityRow[]): PostActivityTrendPoint[] => {
  const monthlyCounts = new Map<string, number>();

  posts.forEach((post) => {
    const key = monthKey(post.posted_at);
    if (!key) return;
    monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + 1);
  });

  return Array.from(monthlyCounts.entries())
    .map(([date, posts]) => ({ date, posts }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const summarizePostActivity = (posts: PostActivityRow[]): PostActivitySummary => {
  const summary = posts.reduce<PostActivitySummary>(
    (current, post) => {
      if (
        post.posted_at &&
        (!current.latest_posted_at ||
          timestampToMs(post.posted_at) > timestampToMs(current.latest_posted_at))
      ) {
        current.latest_posted_at = post.posted_at;
      }

      if (
        post.posted_at &&
        (!current.first_posted_at ||
          timestampToMs(post.posted_at) < timestampToMs(current.first_posted_at))
      ) {
        current.first_posted_at = post.posted_at;
      }

      const newestActivity =
        timestampToMs(post.scraped_at) > timestampToMs(post.posted_at)
          ? post.scraped_at
          : post.posted_at;

      if (
        newestActivity &&
        (!current.latest_activity_at ||
          timestampToMs(newestActivity) > timestampToMs(current.latest_activity_at))
      ) {
        current.latest_activity_at = newestActivity;
      }

      return current;
    },
    {
      latest_posted_at: null,
      latest_activity_at: null,
      first_posted_at: null,
      posting_span_days: 0,
    }
  );

  summary.posting_span_days = daysBetween(summary.first_posted_at, summary.latest_posted_at);
  return summary;
};
