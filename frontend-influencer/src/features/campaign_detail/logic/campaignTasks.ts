import type { CampaignTask } from "../types";

export const DEFAULT_CAMPAIGN_TASK_TITLES = [
  "候補者を選定する",
  "候補者に連絡する",
  "見積金額を確認する",
  "投稿内容・訴求軸を確認する",
  "投稿予定日を確定する",
  "公開後の成果を確認する",
];

export const buildFallbackCampaignTasks = (campaignId: number | string): CampaignTask[] =>
  DEFAULT_CAMPAIGN_TASK_TITLES.map((title, index) => ({
    id: -(index + 1),
    campaign_id: campaignId,
    title,
    completed: false,
    position: index + 1,
  }));

export const campaignTaskProgress = (tasks: CampaignTask[]) => {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
};
