import type {
  BookmarkedInfluencer,
  BookmarkWatchlistAlert,
  BookmarkWatchlistAlertSeverity,
} from "../types";
import { bookmarkDaysSince } from "./bookmarkFormatters";

const alertClassBySeverity: Record<BookmarkWatchlistAlertSeverity, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-[#D4AF37]/45 bg-[#fffdf7] text-slate-950",
  info: "border-slate-200 bg-slate-50 text-slate-600",
};

export const bookmarkAlertClassName = (severity: BookmarkWatchlistAlertSeverity) =>
  alertClassBySeverity[severity];

const FOLLOWER_GROWTH_ALERT_MIN_GAIN = 1000;
const FOLLOWER_GROWTH_ALERT_RATE = 0.12;
const FOLLOWER_SURGE_ALERT_MIN_GAIN = 3000;
const FOLLOWER_SURGE_ALERT_RATE = 0.3;

const getFollowerGrowth = (influencer: BookmarkedInfluencer) => {
  const previousFollowers = influencer.savedSnapshot?.followers ?? null;
  const currentFollowers = influencer.accounts_metrics?.followers ?? null;

  if (
    previousFollowers === null ||
    currentFollowers === null ||
    previousFollowers <= 0 ||
    currentFollowers <= previousFollowers
  ) {
    return null;
  }

  const gain = currentFollowers - previousFollowers;
  const rate = gain / previousFollowers;

  return { gain, rate };
};

export const buildBookmarkWatchlistAlerts = (
  influencer: BookmarkedInfluencer
): BookmarkWatchlistAlert[] => {
  const alerts: BookmarkWatchlistAlert[] = [];
  const profileAgeDays = bookmarkDaysSince(influencer.last_profile_scraped_at);
  const metricAgeDays = bookmarkDaysSince(influencer.accounts_metrics?.metric_date);
  const postedAgeDays = bookmarkDaysSince(influencer.latest_posted_at);
  const activityAgeDays = bookmarkDaysSince(influencer.latest_activity_at);
  const growth = getFollowerGrowth(influencer);

  if (!influencer.accounts_metrics) {
    alerts.push({
      id: "metrics-missing",
      label: "指標なし",
      description: "フォロワー・投稿数・最大いいね数の最新指標がありません。",
      severity: "high",
    });
  } else if (
    (metricAgeDays !== null && metricAgeDays >= 30) ||
    (profileAgeDays !== null && profileAgeDays >= 30)
  ) {
    const oldestAgeDays = Math.max(metricAgeDays ?? 0, profileAgeDays ?? 0);
    alerts.push({
      id: "data-stale",
      label: "データが古い",
      description: `プロフィールまたは指標の更新から${oldestAgeDays}日以上経過しています。`,
      severity: oldestAgeDays >= 60 ? "high" : "medium",
    });
  }

  if (profileAgeDays === null) {
    alerts.push({
      id: "profile-unknown",
      label: "取得日不明",
      description: "プロフィールの最終取得日が確認できません。",
      severity: "info",
    });
  }

  if (!influencer.latest_activity_at) {
    alerts.push({
      id: "activity-unknown",
      label: "活動不明",
      description: "投稿または活動日のデータがありません。",
      severity: "info",
    });
  } else if (activityAgeDays !== null && activityAgeDays >= 21) {
    alerts.push({
      id: "activity-stale",
      label: "活動停滞",
      description: `最後に確認できた活動から${activityAgeDays}日経過しています。`,
      severity: activityAgeDays >= 45 ? "high" : "medium",
    });
  }

  if (postedAgeDays !== null && postedAgeDays >= 30) {
    alerts.push({
      id: "posting-gap",
      label: "30日以上投稿なし",
      description: `最新投稿の確認から${postedAgeDays}日経過しています。`,
      severity: postedAgeDays >= 60 ? "high" : "medium",
    });
  } else if (postedAgeDays !== null && postedAgeDays >= 14) {
    alerts.push({
      id: "posting-slowdown",
      label: "投稿頻度が低下",
      description: `最新投稿から${postedAgeDays}日経過しており、投稿ペースの鈍化が見られます。`,
      severity: "info",
    });
  }

  if (
    growth &&
    growth.gain >= FOLLOWER_SURGE_ALERT_MIN_GAIN &&
    growth.rate >= FOLLOWER_SURGE_ALERT_RATE
  ) {
    alerts.push({
      id: "follower-surge",
      label: "フォロワー急増",
      description: `保存時からフォロワーが${growth.gain.toLocaleString()}人増えています。`,
      severity: "high",
    });
  } else if (
    growth &&
    growth.gain >= FOLLOWER_GROWTH_ALERT_MIN_GAIN &&
    growth.rate >= FOLLOWER_GROWTH_ALERT_RATE
  ) {
    alerts.push({
      id: "recent-growth",
      label: "最近伸びている",
      description: `保存時からフォロワーが${growth.gain.toLocaleString()}人増加しています。`,
      severity: "info",
    });
  }

  if (influencer.priority === "high" && !influencer.whySavedMemo.trim()) {
    alerts.push({
      id: "high-priority-memo-missing",
      label: "理由未記入",
      description: "優先度が高い候補ですが、保存理由メモがありません。",
      severity: "medium",
    });
  }

  return alerts;
};

export const buildBookmarkWatchlistSummary = (influencers: BookmarkedInfluencer[]) => {
  const rows = influencers.map((influencer) => ({
    influencer,
    alerts: buildBookmarkWatchlistAlerts(influencer),
  }));

  return {
    rows,
    totalAlerts: rows.reduce((sum, row) => sum + row.alerts.length, 0),
    highAlerts: rows.reduce(
      (sum, row) => sum + row.alerts.filter((alert) => alert.severity === "high").length,
      0
    ),
    mediumAlerts: rows.reduce(
      (sum, row) => sum + row.alerts.filter((alert) => alert.severity === "medium").length,
      0
    ),
    affectedInfluencers: rows.filter((row) => row.alerts.length > 0).length,
  };
};
