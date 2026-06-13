import type { BookmarkPriorityValue } from "../types";

export const BOOKMARK_PRIORITY_OPTIONS: Array<{
  value: BookmarkPriorityValue;
  label: string;
}> = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

export const bookmarkPriorityLabel = (priority: BookmarkPriorityValue | null) => {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return "未設定";
  }
};

export const bookmarkPriorityClassName = (priority: BookmarkPriorityValue | null) => {
  switch (priority) {
    case "high":
      return "border-red-200 bg-red-50 text-red-700";
    case "medium":
      return "border-[#D4AF37]/45 bg-[#fffdf7] text-slate-950";
    case "low":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-slate-200 bg-white text-slate-500";
  }
};
