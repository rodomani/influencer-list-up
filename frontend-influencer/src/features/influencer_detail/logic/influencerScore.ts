import type { InfluencerAverageCommentAnalysis, MetricsRow } from "../types";
import { clampScore, timestampToMs } from "./formatters";

export const SCORE_BENCHMARKS = {
  followers: 300_000,
  maximumLikes: 30_000,
  posts: 200,
  postingSpanDays: 180,
};

export const normalizeLinearScore = (value: number | null | undefined, max: number) => {
  if (typeof value !== "number" || value <= 0 || max <= 0) return 0;
  return clampScore((value / max) * 100);
};

export const normalizeLogScore = (value: number | null | undefined, max: number) => {
  if (typeof value !== "number" || value <= 0 || max <= 1) return 0;
  return clampScore((Math.log10(value + 1) / Math.log10(max + 1)) * 100);
};

export const freshnessScore = (value: string | null | undefined) => {
  const postedAt = timestampToMs(value);
  if (postedAt === Number.NEGATIVE_INFINITY) return 0;
  const ageDays = Math.floor((Date.now() - postedAt) / 86_400_000);
  if (ageDays <= 14) return 100;
  if (ageDays <= 45) return 80;
  if (ageDays <= 120) return 55;
  if (ageDays <= 240) return 35;
  return 20;
};

export const commentQualityScore = (analysis: InfluencerAverageCommentAnalysis | null) => {
  if (!analysis) return 65;
  const sentiment = typeof analysis.avg_sentiment === "number" ? ((analysis.avg_sentiment + 1) / 2) * 100 : 65;
  const spamPenalty = typeof analysis.avg_spam_rate === "number" ? analysis.avg_spam_rate * 100 : 12;
  const toxicityPenalty = typeof analysis.avg_toxicity === "number" ? analysis.avg_toxicity * 100 : 8;
  return clampScore(sentiment - spamPenalty * 0.6 - toxicityPenalty * 0.4);
};

export const calculateWeightedInfluencerScore = ({
  metrics,
  latestPostedAt,
  postingSpanDays,
  analysis,
}: {
  metrics: MetricsRow | null;
  latestPostedAt: string | null | undefined;
  postingSpanDays: number | null | undefined;
  analysis: InfluencerAverageCommentAnalysis | null;
}) =>
  clampScore(
    normalizeLogScore(metrics?.followers, SCORE_BENCHMARKS.followers) * 0.25 +
      normalizeLogScore(metrics?.maximum_likes, SCORE_BENCHMARKS.maximumLikes) * 0.2 +
      normalizeLinearScore(metrics?.posts, SCORE_BENCHMARKS.posts) * 0.15 +
      freshnessScore(latestPostedAt) * 0.2 +
      normalizeLinearScore(postingSpanDays, SCORE_BENCHMARKS.postingSpanDays) * 0.1 +
      commentQualityScore(analysis) * 0.1
  );
