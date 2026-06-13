import type { FreshnessState, MetricsRow } from "../types";

export const formatMetric = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("ja-JP").format(value) : "未設定";

export const formatDateYmd = (value: string | null | undefined) => {
  if (!value) return "未設定";
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const timestampToMs = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

export const mostRecentTimestamp = (...values: Array<string | null | undefined>) =>
  values.reduce<string | null>((latest, value) => {
    if (timestampToMs(value) > timestampToMs(latest)) return value ?? null;
    return latest;
  }, null);

export const dataFreshness = (value: string | null | undefined): FreshnessState => {
  const time = timestampToMs(value);
  if (time === Number.NEGATIVE_INFINITY) {
    return {
      label: "未取得",
      age: "更新日なし",
      className: "border-slate-200 bg-slate-50 text-slate-500",
    };
  }

  const ageDays = Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
  const age = ageDays === 0 ? "今日更新" : `${new Intl.NumberFormat("ja-JP").format(ageDays)}日前`;

  if (ageDays <= 7) {
    return {
      label: "最新",
      age,
      className: "border-[#046307]/25 bg-[#046307]/5 text-[#046307]",
    };
  }
  if (ageDays <= 30) {
    return {
      label: "良好",
      age,
      className: "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-slate-900",
    };
  }
  if (ageDays <= 90) {
    return {
      label: "要確認",
      age,
      className: "border-amber-300 bg-amber-50 text-amber-800",
    };
  }
  return {
    label: "古い",
    age,
    className: "border-red-200 bg-red-50 text-red-700",
  };
};

export const daysBetween = (start: string | null | undefined, end: string | null | undefined) => {
  const startMs = timestampToMs(start);
  const endMs = timestampToMs(end);
  if (startMs === Number.NEGATIVE_INFINITY || endMs === Number.NEGATIVE_INFINITY) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
};

export const formatDays = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? `${new Intl.NumberFormat("ja-JP").format(value)}日` : "未設定";

export const metricNumber = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? value : 0;

export const engagementRate = (metrics: MetricsRow | null | undefined) => {
  const followers = metricNumber(metrics?.followers);
  if (followers === 0) return 0;
  return metricNumber(metrics?.maximum_likes) / followers;
};

export const splitKeywords = (value: string | null | undefined) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : [];

export const keywordCount = (value: string | null | undefined) => splitKeywords(value).length;
