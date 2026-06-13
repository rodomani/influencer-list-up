import type {
  Campaign,
  CampaignCalendarEvent,
  CampaignCalendarMonth,
  CampaignCustomCalendarEvent,
  CampaignInfluencer,
  CampaignTask,
} from "../types";
import { campaignDeliverableStatusLabel } from "./campaignDeliverables";

const DAY_MS = 86_400_000;

const dateToMs = (value: string | null | undefined) => {
  if (!value) return Number.NaN;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  const time = date.getTime();
  return Number.isNaN(time) ? Number.NaN : time;
};

const toDateKey = (value: string | null | undefined) => {
  const time = dateToMs(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString().split("T")[0];
};

const midpointDateKey = (startDate: string | null | undefined, endDate: string | null | undefined) => {
  const start = dateToMs(startDate);
  const end = dateToMs(endDate);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return new Date(start + (end - start) / 2).toISOString().split("T")[0];
};

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(date);

const eventToneOrder: Record<CampaignCalendarEvent["type"], number> = {
  campaign: 1,
  review: 2,
  deliverable: 3,
  influencer: 4,
  task: 5,
  custom: 6,
};

export const campaignCalendarEventClassName = (type: CampaignCalendarEvent["type"]) => {
  switch (type) {
    case "campaign":
      return "border-[#D4AF37]/50 bg-[#fffdf7] text-slate-950";
    case "review":
      return "border-[#86b89a]/60 bg-[#f5fbf7] text-slate-950";
    case "deliverable":
      return "border-sky-200 bg-sky-50 text-slate-950";
    case "influencer":
      return "border-slate-200 bg-white text-slate-700";
    case "task":
      return "border-violet-200 bg-violet-50 text-slate-950";
    case "custom":
      return "border-[#D4AF37]/35 bg-[#fffdf7] text-slate-950";
  }
};

export const campaignCalendarEventLabel = (type: CampaignCalendarEvent["type"]) => {
  switch (type) {
    case "campaign":
      return "期間";
    case "review":
      return "確認";
    case "deliverable":
      return "納品";
    case "influencer":
      return "候補者";
    case "task":
      return "タスク";
    case "custom":
      return "追加予定";
  }
};

export const campaignCustomCalendarEventTypeLabel = (type: string | null | undefined) => {
  switch (type) {
    case "meeting":
      return "打ち合わせ";
    case "content_review":
      return "内容確認";
    case "payment":
      return "支払い期限";
    case "posting":
      return "投稿予定";
    case "report":
      return "レポート";
    default:
      return "その他";
  }
};

export const buildCampaignCalendarEvents = ({
  campaign,
  influencers,
  tasks,
  customEvents = [],
}: {
  campaign: Campaign | undefined;
  influencers: CampaignInfluencer[];
  tasks: CampaignTask[];
  customEvents?: CampaignCustomCalendarEvent[];
}): CampaignCalendarEvent[] => {
  const events: CampaignCalendarEvent[] = [];
  const startDate = toDateKey(campaign?.start_date);
  const endDate = toDateKey(campaign?.end_date);
  const reviewDate = midpointDateKey(campaign?.start_date, campaign?.end_date);

  if (startDate) {
    events.push({
      id: "campaign-start",
      date: startDate,
      label: "キャンペーン開始",
      description: campaign?.name ?? "キャンペーン",
      type: "campaign",
    });
  }

  if (reviewDate) {
    events.push({
      id: "campaign-review",
      date: reviewDate,
      label: "中間確認",
      description: "進捗・予算・納品状況を確認するタイミングです。",
      type: "review",
    });
  }

  if (endDate) {
    events.push({
      id: "campaign-end",
      date: endDate,
      label: "キャンペーン終了",
      description: campaign?.name ?? "キャンペーン",
      type: "campaign",
    });
  }

  influencers.forEach((influencer) => {
    const accountName = influencer.account?.account_name ?? `ID: ${influencer.account_id}`;
    const addedDate = toDateKey(influencer.added_at);
    const dueDate = toDateKey(influencer.deliverable_due_date);

    if (addedDate) {
      events.push({
        id: `influencer-${influencer.id}`,
        date: addedDate,
        label: "候補者追加",
        description: accountName,
        type: "influencer",
      });
    }

    if (dueDate) {
      events.push({
        id: `deliverable-${influencer.id}`,
        date: dueDate,
        label: "納品期限",
        description: `${accountName} / ${campaignDeliverableStatusLabel(influencer.deliverable_status)}`,
        type: "deliverable",
      });
    }
  });

  tasks
    .filter((task) => task.completed)
    .forEach((task) => {
      const completedDate = toDateKey(task.updated_at ?? task.created_at);
      if (!completedDate) return;

      events.push({
        id: `task-${task.id}`,
        date: completedDate,
        label: "タスク完了",
        description: task.title,
        type: "task",
      });
    });

  customEvents.forEach((event) => {
    const eventDate = toDateKey(event.event_date);
    if (!eventDate) return;

    events.push({
      id: `custom-${event.id}`,
      date: eventDate,
      label: event.title,
      description: event.description?.trim() || campaignCustomCalendarEventTypeLabel(event.event_type),
      type: "custom",
    });
  });

  return events.sort((a, b) => {
    const dateDiff = dateToMs(a.date) - dateToMs(b.date);
    if (dateDiff !== 0) return dateDiff;
    return eventToneOrder[a.type] - eventToneOrder[b.type];
  });
};

export const buildCampaignCalendarMonths = (
  events: CampaignCalendarEvent[],
  campaign: Campaign | undefined,
  maxMonths = 4
): CampaignCalendarMonth[] => {
  const datedValues = [
    campaign?.start_date,
    campaign?.end_date,
    ...events.map((event) => event.date),
  ]
    .map(dateToMs)
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => a - b);

  if (datedValues.length === 0) return [];

  const start = new Date(datedValues[0]);
  const end = new Date(datedValues[datedValues.length - 1]);
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = new Date(end.getFullYear(), end.getMonth(), 1);
  const eventMap = new Map<string, CampaignCalendarEvent[]>();
  events.forEach((event) => {
    eventMap.set(event.date, [...(eventMap.get(event.date) ?? []), event]);
  });

  const months: CampaignCalendarMonth[] = [];
  for (
    let cursor = new Date(monthStart);
    cursor <= monthEnd && months.length < maxMonths;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const firstDay = new Date(cursor);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getTime() + index * DAY_MS);
      const dateKey = date.toISOString().split("T")[0];
      return {
        key: dateKey,
        dayNumber: date.getDate(),
        date: dateKey,
        inMonth: date.getMonth() === cursor.getMonth(),
        events: eventMap.get(dateKey) ?? [],
      };
    });

    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth() + 1}`,
      label: monthLabel(cursor),
      days,
    });
  }

  return months;
};

export const formatCalendarEventDate = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
