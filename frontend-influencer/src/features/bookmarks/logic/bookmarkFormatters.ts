export const formatBookmarkDate = (value: string | null | undefined) => {
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

export const formatBookmarkMetric = (value: number | null | undefined) =>
  typeof value === "number" && value >= 0
    ? new Intl.NumberFormat("ja-JP").format(value)
    : "未設定";

export const formatBookmarkDateTime = (value: string | null | undefined) => {
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

export const splitBookmarkKeywords = (value: string | null | undefined) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : [];

export const bookmarkTimestampToMs = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

export const bookmarkDaysSince = (value: string | null | undefined) => {
  const time = bookmarkTimestampToMs(value);
  if (time === Number.NEGATIVE_INFINITY) return null;
  return Math.floor((Date.now() - time) / 86_400_000);
};
