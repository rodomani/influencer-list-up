import type { CampaignCompareMetric, CampaignCompareRow } from "../types";

export const parseCampaignCompareIds = (rawIds: string | null) =>
  (rawIds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);

export const formatCompareNumber = (value: string | number | null) =>
  typeof value === "number" ? new Intl.NumberFormat("ja-JP").format(value) : "未設定";

export const formatCompareCurrency = (value: string | number | null) =>
  typeof value === "number" ? `¥${new Intl.NumberFormat("ja-JP").format(value)}` : "未設定";

export const formatComparePercent = (value: string | number | null) =>
  typeof value === "number" ? `${(value * 100).toFixed(2)}%` : "未設定";

export const formatCompareScore = (value: string | number | null) =>
  typeof value === "number" ? `${Math.round(value)} / 100` : "未設定";

export const formatCompareText = (value: string | number | null) =>
  value == null || value === "" ? "未設定" : String(value);

export const formatCompareDate = (value: string | number | null) =>
  typeof value === "string" && value ? value : "未設定";

export const timestampToMs = (value: string | number | null) => {
  if (typeof value !== "string" || !value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value.includes("T") ? value : `${value}T00:00:00`).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

export const bestValueByMetric = (metrics: CampaignCompareMetric[]) => {
  const map = new Map<string, number>();
  metrics.forEach((metric) => {
    if (!metric.numeric) return;
    const values = metric.values.filter((value): value is number => typeof value === "number");
    const validValues = values.filter((value) => Number.isFinite(value));
    if (validValues.length === 0) {
      map.set(metric.label, Number.NEGATIVE_INFINITY);
      return;
    }
    map.set(
      metric.label,
      metric.higherIsBetter === false ? Math.min(...validValues) : Math.max(...validValues)
    );
  });
  return map;
};

export const bestDateByMetric = (metrics: CampaignCompareMetric[]) => {
  const map = new Map<string, number>();
  metrics.forEach((metric) => {
    if (!metric.date) return;
    map.set(metric.label, Math.max(...metric.values.map(timestampToMs)));
  });
  return map;
};

export const buildCampaignCompareMetrics = (
  rows: CampaignCompareRow[]
): CampaignCompareMetric[] => [
  {
    label: "ステータス",
    values: rows.map((row) => row.campaign.status),
  },
  {
    label: "開始日",
    values: rows.map((row) => row.campaign.start_date),
    date: true,
    format: formatCompareDate,
  },
  {
    label: "終了日",
    values: rows.map((row) => row.campaign.end_date),
    date: true,
    format: formatCompareDate,
  },
  {
    label: "期間日数",
    values: rows.map((row) => row.summary.durationDays),
    numeric: true,
    higherIsBetter: false,
    format: formatCompareNumber,
  },
  {
    label: "予算",
    values: rows.map((row) => row.summary.budget),
    numeric: true,
    format: formatCompareCurrency,
  },
  {
    label: "見積合計",
    values: rows.map((row) => row.summary.assignedCost),
    numeric: true,
    higherIsBetter: false,
    format: formatCompareCurrency,
  },
  {
    label: "残予算",
    values: rows.map((row) => row.summary.remainingBudget),
    numeric: true,
    format: formatCompareCurrency,
  },
  {
    label: "候補者数",
    values: rows.map((row) => row.summary.candidateCount),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "採用人数",
    values: rows.map((row) => row.summary.confirmedCount),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "採用率",
    values: rows.map((row) => row.summary.confirmationRate),
    numeric: true,
    format: formatComparePercent,
  },
  {
    label: "合計フォロワー",
    values: rows.map((row) => row.summary.totalFollowers),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "合計投稿数",
    values: rows.map((row) => row.summary.totalPosts),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "合計最大いいね",
    values: rows.map((row) => row.summary.totalMaxLikes),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "平均フォロワー",
    values: rows.map((row) => row.summary.averageFollowers),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "平均最大いいね",
    values: rows.map((row) => row.summary.averageMaxLikes),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "反応率目安",
    values: rows.map((row) => row.summary.engagementProxyRate),
    numeric: true,
    format: formatComparePercent,
  },
  {
    label: "納品期限設定数",
    values: rows.map((row) => row.summary.deliverableDueCount),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "投稿済み納品数",
    values: rows.map((row) => row.summary.postedDeliverableCount),
    numeric: true,
    format: formatCompareNumber,
  },
  {
    label: "納品完了率",
    values: rows.map((row) => row.summary.deliverableCompletionRate),
    numeric: true,
    format: formatComparePercent,
  },
  {
    label: "候補者あたり予算",
    values: rows.map((row) => row.summary.budgetPerInfluencer),
    numeric: true,
    higherIsBetter: false,
    format: formatCompareCurrency,
  },
  {
    label: "フォロワーあたり予算",
    values: rows.map((row) => row.summary.budgetPerFollower),
    numeric: true,
    higherIsBetter: false,
    format: formatCompareCurrency,
  },
  {
    label: "採用者あたり見積",
    values: rows.map((row) => row.summary.costPerConfirmedInfluencer),
    numeric: true,
    higherIsBetter: false,
    format: formatCompareCurrency,
  },
  {
    label: "最大いいねあたり見積",
    values: rows.map((row) => row.summary.costPerMaxLike),
    numeric: true,
    higherIsBetter: false,
    format: formatCompareCurrency,
  },
  {
    label: "予算使用率",
    values: rows.map((row) => row.summary.budgetUtilizationRate),
    numeric: true,
    higherIsBetter: false,
    format: formatComparePercent,
  },
  {
    label: "準備スコア",
    values: rows.map((row) => row.summary.readinessScore),
    numeric: true,
    format: formatCompareScore,
  },
  {
    label: "効率スコア",
    values: rows.map((row) => row.summary.efficiencyScore),
    numeric: true,
    format: formatCompareScore,
  },
  {
    label: "総合比較スコア",
    values: rows.map((row) => row.summary.comparisonScore),
    numeric: true,
    format: formatCompareScore,
  },
  {
    label: "目標",
    values: rows.map((row) => row.campaign.goal),
    format: formatCompareText,
  },
];
