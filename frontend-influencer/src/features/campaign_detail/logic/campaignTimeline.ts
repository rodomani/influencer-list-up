import type { Campaign, CampaignInfluencer, CampaignTimelineItem } from "../types";

const timestampToMs = (value: string | null | undefined) => {
  if (!value) return Number.NaN;
  const iso = value.includes("T") ? value : `${value}T00:00:00`;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Number.NaN : time;
};

const earliestDate = (values: Array<string | null | undefined>) => {
  const datedValues = values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => timestampToMs(a) - timestampToMs(b));
  return datedValues[0] ?? null;
};

const midpointDate = (startDate: string | null | undefined, endDate: string | null | undefined) => {
  const start = timestampToMs(startDate);
  const end = timestampToMs(endDate);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return new Date(start + (end - start) / 2).toISOString();
};

const statusForDate = (date: string | null, now: Date): CampaignTimelineItem["status"] => {
  if (!date) return "missing";
  const time = timestampToMs(date);
  if (Number.isNaN(time)) return "missing";
  const nowTime = now.getTime();
  const dayMs = 86_400_000;
  if (Math.abs(time - nowTime) <= dayMs) return "current";
  return time < nowTime ? "done" : "upcoming";
};

export const formatTimelineDate = (value: string | null | undefined) => {
  if (!value) return "未設定";
  const time = timestampToMs(value);
  if (Number.isNaN(time)) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(time));
};

export const buildCampaignTimeline = (
  campaign: Campaign | undefined,
  influencers: CampaignInfluencer[],
  now = new Date()
): CampaignTimelineItem[] => {
  const firstInfluencerAddedAt = earliestDate(influencers.map((influencer) => influencer.added_at));
  const firstContactingAt = earliestDate(
    influencers
      .filter((influencer) => influencer.status === "contacting" || influencer.status === "confirmed")
      .map((influencer) => influencer.added_at)
  );
  const firstConfirmedAt = earliestDate(
    influencers
      .filter((influencer) => influencer.status === "confirmed")
      .map((influencer) => influencer.added_at)
  );
  const reviewDate = midpointDate(campaign?.start_date, campaign?.end_date);

  const items: Array<Omit<CampaignTimelineItem, "status">> = [
    {
      key: "created",
      label: "作成",
      date: campaign?.created_at ?? null,
      description: "キャンペーンが作成された日です。",
    },
    {
      key: "influencer-added",
      label: "候補者追加",
      date: firstInfluencerAddedAt,
      description: "最初の候補者がキャンペーンに追加された日です。",
    },
    {
      key: "contacting",
      label: "連絡開始",
      date: firstContactingAt,
      description: "候補者ステータスが連絡中または採用になった最初の日です。",
    },
    {
      key: "confirmed",
      label: "採用確定",
      date: firstConfirmedAt,
      description: "採用ステータスの候補者が最初に出た日です。",
    },
    {
      key: "start",
      label: "開始",
      date: campaign?.start_date ?? null,
      description: "キャンペーン開始日です。",
    },
    {
      key: "review",
      label: "中間確認",
      date: reviewDate,
      description: "開始日と終了日の中間に設定した確認タイミングです。",
    },
    {
      key: "end",
      label: "終了",
      date: campaign?.end_date ?? null,
      description: "キャンペーン終了日です。",
    },
  ];

  return items.map((item) => ({
    ...item,
    status: statusForDate(item.date, now),
  }));
};
