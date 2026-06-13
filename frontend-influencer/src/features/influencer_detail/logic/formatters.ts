export const formatDateYmd = (value: string | null) => {
  if (!value) return "未設定";
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "未設定";
  const ymd = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return ymd.replace(/-/g, "/");
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "未設定";
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== "number") return "未設定";
  return `${(value * 100).toFixed(1)}%`;
};

export const formatScore = (value: number | null | undefined, digits = 2) => {
  if (typeof value !== "number") return "未設定";
  return value.toFixed(digits);
};

export const formatDays = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? `${new Intl.NumberFormat("ja-JP").format(value)}日` : "未設定";

export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("ja-JP", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatChartDate = (value: string) => {
  const time = timestampToMs(value);
  if (time === Number.NEGATIVE_INFINITY) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(time));
};

export const formatChartMonth = (value: string) => value.replace("-", "/");

export const timestampToMs = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

export const ageInDays = (value: string | null | undefined) => {
  const time = timestampToMs(value);
  if (time === Number.NEGATIVE_INFINITY) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
};

export const mostRecentTimestamp = (...values: Array<string | null | undefined>) =>
  values.reduce<string | null>((latest, value) => {
    if (timestampToMs(value) > timestampToMs(latest)) return value ?? null;
    return latest;
  }, null);

export const daysBetween = (start: string | null | undefined, end: string | null | undefined) => {
  const startMs = timestampToMs(start);
  const endMs = timestampToMs(end);
  if (startMs === Number.NEGATIVE_INFINITY || endMs === Number.NEGATIVE_INFINITY) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
};

export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
