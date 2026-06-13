import type {
  InfluencerAverageCommentAnalysis,
  MetricsRow,
  PostActivitySummary,
  SimilarBenchmark,
  SimilarBenchmarkMetric,
  SimilarInfluencerRow,
} from "../types";
import { clampScore, timestampToMs } from "./formatters";
import { calculateWeightedInfluencerScore, commentQualityScore } from "./influencerScore";

export const splitKeywords = (value: string | null | undefined) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean)
    : [];

export const hasSharedKeyword = (left: string | null | undefined, right: string | null | undefined) => {
  const leftKeywords = new Set(splitKeywords(left));
  return splitKeywords(right).some((keyword) => leftKeywords.has(keyword));
};

export const latestMetricRow = (rows: MetricsRow[] | null | undefined) =>
  Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

const buildBenchmarkMetric = (
  label: string,
  currentValue: number,
  similarValues: number[]
): SimilarBenchmarkMetric | null => {
  const values = similarValues.filter((value) => Number.isFinite(value));
  if (values.length === 0) return null;

  const betterThanCount = values.filter((value) => currentValue >= value).length;
  const percentile = clampScore((betterThanCount / values.length) * 100);
  const rank = values.filter((value) => value > currentValue).length + 1;

  return {
    label,
    currentValue,
    percentile,
    topPercent: Math.max(1, 100 - percentile),
    rank,
    sampleSize: values.length,
  };
};

export const benchmarkLabel = (topPercent: number) => {
  if (topPercent <= 10) return "非常に強い";
  if (topPercent <= 25) return "強い";
  if (topPercent <= 50) return "平均以上";
  return "改善余地あり";
};

export const buildSimilarBenchmark = ({
  currentMetrics,
  currentScore,
  currentPostActivity,
  currentAnalysis,
  similarInfluencers,
  similarPostActivity,
  similarAnalysis,
}: {
  currentMetrics: MetricsRow | null;
  currentScore: number;
  currentPostActivity: PostActivitySummary | null;
  currentAnalysis: InfluencerAverageCommentAnalysis | null;
  similarInfluencers: SimilarInfluencerRow[];
  similarPostActivity: Map<number, PostActivitySummary>;
  similarAnalysis: Map<number, InfluencerAverageCommentAnalysis>;
}): SimilarBenchmark | null => {
  if (similarInfluencers.length === 0) return null;

  const similarScores = similarInfluencers.map((similar) => {
    const metrics = latestMetricRow(similar.accounts_metrics);
    const activity = similarPostActivity.get(similar.id) ?? null;
    return calculateWeightedInfluencerScore({
      metrics,
      latestPostedAt: activity?.latest_posted_at,
      postingSpanDays: activity?.posting_span_days,
      analysis: similarAnalysis.get(similar.id) ?? null,
    });
  });

  const metricDefinitions: Array<[string, number, number[]]> = [
    ["総合スコア", currentScore, similarScores],
    [
      "フォロワー数",
      Math.max(currentMetrics?.followers ?? 0, 0),
      similarInfluencers.map((similar) => Math.max(latestMetricRow(similar.accounts_metrics)?.followers ?? 0, 0)),
    ],
    [
      "最大いいね数",
      Math.max(currentMetrics?.maximum_likes ?? 0, 0),
      similarInfluencers.map((similar) => Math.max(latestMetricRow(similar.accounts_metrics)?.maximum_likes ?? 0, 0)),
    ],
    [
      "投稿数",
      Math.max(currentMetrics?.posts ?? 0, 0),
      similarInfluencers.map((similar) => Math.max(latestMetricRow(similar.accounts_metrics)?.posts ?? 0, 0)),
    ],
    [
      "最新投稿日",
      timestampToMs(currentPostActivity?.latest_posted_at),
      similarInfluencers.map((similar) => timestampToMs(similarPostActivity.get(similar.id)?.latest_posted_at)),
    ],
    [
      "投稿継続期間",
      currentPostActivity?.posting_span_days ?? 0,
      similarInfluencers.map((similar) => similarPostActivity.get(similar.id)?.posting_span_days ?? 0),
    ],
    [
      "コメント品質",
      commentQualityScore(currentAnalysis),
      similarInfluencers.map((similar) => commentQualityScore(similarAnalysis.get(similar.id) ?? null)),
    ],
  ];

  const metrics = metricDefinitions
    .map(([label, currentValue, values]) => buildBenchmarkMetric(label, currentValue, values))
    .filter((metric): metric is SimilarBenchmarkMetric => Boolean(metric));
  const overall = metrics.find((metric) => metric.label === "総合スコア");

  return {
    sampleSize: similarInfluencers.length,
    overallTopPercent: overall?.topPercent ?? 100,
    metrics,
  };
};
