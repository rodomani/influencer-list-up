import type { BookmarkReadinessValue } from "../types";

export const BOOKMARK_READINESS_OPTIONS: Array<{
  value: BookmarkReadinessValue;
  label: string;
}> = [
  { value: "未確認", label: "未確認" },
  { value: "調査中", label: "調査中" },
  { value: "候補", label: "候補" },
  { value: "連絡候補", label: "連絡候補" },
  { value: "除外候補", label: "除外候補" },
];

export const bookmarkReadinessClassName = (readiness: BookmarkReadinessValue) => {
  switch (readiness) {
    case "未確認":
      return "border-slate-200 bg-white text-slate-500";
    case "調査中":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "候補":
      return "border-[#D4AF37]/45 bg-[#fffdf7] text-slate-950";
    case "連絡候補":
      return "border-[#046307]/30 bg-[#ecfdf5] text-slate-950";
    case "除外候補":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-white text-slate-500";
  }
};
