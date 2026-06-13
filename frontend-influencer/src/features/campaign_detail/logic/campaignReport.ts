import type {
  Campaign,
  CampaignBudgetAllocation,
  CampaignCalendarEvent,
  CampaignInfluencer,
  CampaignPerformanceSummary,
  CampaignRoiEfficiency,
  CampaignTask,
} from "../types";
import { campaignDeliverableStatusLabel } from "./campaignDeliverables";
import { formatCampaignBudget, formatCampaignPeriod } from "./campaignDetailFormatters";
import {
  campaignInfluencerStatusLabel,
  formatInfluencerMetric,
  latestCampaignInfluencerMetric,
} from "./campaignInfluencerFormatters";
import {
  formatPerformanceNumber,
  formatPerformancePercent,
} from "./campaignPerformance";
import { formatRoiNumber, formatRoiPercent } from "./campaignRoiEfficiency";

const csvEscape = (value: string | number | null | undefined) => {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const dateStamp = () => new Date().toISOString().split("T")[0];

export const campaignReportFileName = (campaign: Campaign) =>
  `campaign-report-${campaign.id}-${dateStamp()}`;

export const buildCampaignReportHighlights = ({
  campaign,
  performance,
  allocation,
  roi,
  tasks,
}: {
  campaign: Campaign;
  performance: CampaignPerformanceSummary;
  allocation: CampaignBudgetAllocation;
  roi: CampaignRoiEfficiency;
  tasks: CampaignTask[];
}) => {
  const completedTasks = tasks.filter((task) => task.completed).length;
  const taskProgress =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return [
    {
      label: "キャンペーン期間",
      value: formatCampaignPeriod(campaign.start_date, campaign.end_date),
      note: campaign.status ?? "未設定",
    },
    {
      label: "予定予算",
      value: formatCampaignBudget(campaign.budget),
      note: `割当済み ${formatRoiNumber(allocation.assignedCost)}`,
    },
    {
      label: "想定リーチ",
      value: formatPerformanceNumber(performance.projectedReach),
      note: `${formatPerformanceNumber(performance.candidateCount)}人の候補者`,
    },
    {
      label: "ROI効率スコア",
      value: String(roi.efficiencyScore),
      note: `予算使用率 ${formatRoiPercent(roi.budgetUtilization)}`,
    },
    {
      label: "タスク進捗",
      value: `${taskProgress}%`,
      note: `${completedTasks} / ${tasks.length}件完了`,
    },
    {
      label: "反応率目安",
      value: formatPerformancePercent(performance.engagementProxyRate),
      note: "最大いいね合計 / フォロワー合計",
    },
  ];
};

export const buildCampaignReportCsv = ({
  campaign,
  performance,
  allocation,
  roi,
  influencers,
  tasks,
  events,
}: {
  campaign: Campaign;
  performance: CampaignPerformanceSummary;
  allocation: CampaignBudgetAllocation;
  roi: CampaignRoiEfficiency;
  influencers: CampaignInfluencer[];
  tasks: CampaignTask[];
  events: CampaignCalendarEvent[];
}) => {
  const summaryRows = [
    ["セクション", "項目", "値", "補足"],
    ["概要", "キャンペーン名", campaign.name, ""],
    ["概要", "期間", formatCampaignPeriod(campaign.start_date, campaign.end_date), ""],
    ["概要", "ステータス", campaign.status ?? "未設定", ""],
    ["概要", "目標", campaign.goal ?? "未設定", ""],
    ["予算", "予定予算", formatCampaignBudget(campaign.budget), ""],
    ["予算", "割当済み費用", formatRoiNumber(allocation.assignedCost), ""],
    ["予算", "残予算", formatRoiNumber(allocation.remainingBudget), ""],
    ["ROI", "効率スコア", roi.efficiencyScore, ""],
    ["ROI", "フォロワー単価", formatRoiNumber(roi.costPerFollower), ""],
    ["ROI", "反応単価", formatRoiNumber(roi.costPerMaxLike), ""],
    ["ROI", "投稿単価", formatRoiNumber(roi.costPerPost), ""],
    ["パフォーマンス", "想定リーチ", formatPerformanceNumber(performance.projectedReach), ""],
    ["パフォーマンス", "候補者数", formatPerformanceNumber(performance.candidateCount), ""],
    ["パフォーマンス", "反応率目安", formatPerformancePercent(performance.engagementProxyRate), ""],
  ];

  const influencerRows = [
    [],
    ["インフルエンサー", "名前", "状態", "見積", "納品状態", "納品期限", "投稿数", "フォロワー", "最大いいね"],
    ...influencers.map((influencer) => {
      const metrics = latestCampaignInfluencerMetric(influencer.account?.accounts_metrics);
      return [
        "インフルエンサー",
        influencer.account?.account_name ?? `ID:${influencer.account_id}`,
        campaignInfluencerStatusLabel(influencer.status),
        formatRoiNumber(influencer.quoted_price),
        campaignDeliverableStatusLabel(influencer.deliverable_status),
        influencer.deliverable_due_date ?? "",
        formatInfluencerMetric(metrics?.posts),
        formatInfluencerMetric(metrics?.followers),
        formatInfluencerMetric(metrics?.maximum_likes),
      ];
    }),
  ];

  const taskRows = [
    [],
    ["タスク", "内容", "状態", "更新日"],
    ...tasks.map((task) => [
      "タスク",
      task.title,
      task.completed ? "完了" : "未完了",
      task.updated_at ?? task.created_at ?? "",
    ]),
  ];

  const eventRows = [
    [],
    ["カレンダー", "日付", "種類", "予定", "補足"],
    ...events.map((event) => [
      "カレンダー",
      event.date,
      event.type,
      event.label,
      event.description,
    ]),
  ];

  return [...summaryRows, ...influencerRows, ...taskRows, ...eventRows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
};

export const downloadCampaignReportCsv = (fileName: string, csv: string) => {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
