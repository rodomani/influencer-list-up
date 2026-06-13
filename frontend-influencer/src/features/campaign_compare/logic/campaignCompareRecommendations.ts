import type {
  CampaignCompareRecommendation,
  CampaignCompareRow,
} from "../types";

export const buildCampaignCompareRecommendation = (
  rows: CampaignCompareRow[]
): CampaignCompareRecommendation | null => {
  if (rows.length === 0) return null;

  const ranked = [...rows].sort(
    (a, b) => b.summary.comparisonScore - a.summary.comparisonScore
  );
  const best = ranked[0];
  if (!best) return null;

  const reasons = [
    `総合比較スコアが${best.summary.comparisonScore}/100`,
    `準備スコアが${best.summary.readinessScore}/100`,
    `効率スコアが${best.summary.efficiencyScore}/100`,
    ...best.summary.scoreReasons.slice(0, 3),
  ];

  return {
    row: best,
    score: best.summary.comparisonScore,
    reasons,
  };
};
