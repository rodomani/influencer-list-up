import type { ComparisonMetric, InfluencerCompareRow } from "../types";
import {
  dataFreshness,
  formatDateYmd,
  formatMetric,
  formatText,
  latestMetrics,
  mostRecentTimestamp,
  splitKeywords,
  timestampToMs,
} from "./compareFormatters";

export const buildComparisonMetrics = (influencers: InfluencerCompareRow[]): ComparisonMetric[] => [
  {
    label: "プラットフォーム",
    values: influencers.map((influencer) => influencer.platform),
    format: formatText,
  },
  {
    label: "性別",
    values: influencers.map((influencer) => influencer.gender),
    format: formatText,
  },
  {
    label: "キーワード",
    values: influencers.map((influencer) => {
      const keywords = splitKeywords(influencer.keywords);
      return keywords.length ? keywords.join(", ") : null;
    }),
    format: formatText,
  },
  {
    label: "投稿数",
    values: influencers.map((influencer) => latestMetrics(influencer)?.posts),
    format: formatMetric,
    numeric: true,
  },
  {
    label: "フォロワー数",
    values: influencers.map((influencer) => latestMetrics(influencer)?.followers),
    format: formatMetric,
    numeric: true,
  },
  {
    label: "最大いいね数",
    values: influencers.map((influencer) => latestMetrics(influencer)?.maximum_likes),
    format: formatMetric,
    numeric: true,
  },
  {
    label: "最新投稿日",
    values: influencers.map((influencer) => influencer.latest_posted_at),
    format: formatDateYmd,
    date: true,
  },
  {
    label: "最新アクティビティ",
    values: influencers.map((influencer) => influencer.latest_activity_at),
    format: formatDateYmd,
    date: true,
  },
  {
    label: "データ鮮度",
    values: influencers.map((influencer) =>
      mostRecentTimestamp(
        latestMetrics(influencer)?.metric_date,
        influencer.latest_activity_at,
        influencer.latest_posted_at,
        influencer.last_profile_scraped_at
      )
    ),
    format: (value) => {
      const freshness = dataFreshness(typeof value === "string" ? value : null);
      return `${freshness.label} (${freshness.age})`;
    },
    date: true,
  },
  {
    label: "指標更新日",
    values: influencers.map((influencer) => latestMetrics(influencer)?.metric_date),
    format: formatDateYmd,
    date: true,
  },
  {
    label: "プロフィール更新日",
    values: influencers.map((influencer) => influencer.last_profile_scraped_at),
    format: formatDateYmd,
    date: true,
  },
];

export const bestValueByMetric = (metrics: ComparisonMetric[]) =>
  new Map(
    metrics
      .filter((metric) => metric.numeric)
      .map((metric) => [
        metric.label,
        Math.max(
          ...metric.values.map((value) =>
            typeof value === "number" && value >= 0 ? value : Number.NEGATIVE_INFINITY
          )
        ),
      ])
  );

export const bestDateByMetric = (metrics: ComparisonMetric[]) =>
  new Map(
    metrics
      .filter((metric) => metric.date)
      .map((metric) => [
        metric.label,
        Math.max(
          ...metric.values.map((value) =>
            typeof value === "string" ? timestampToMs(value) : Number.NEGATIVE_INFINITY
          )
        ),
      ])
  );
