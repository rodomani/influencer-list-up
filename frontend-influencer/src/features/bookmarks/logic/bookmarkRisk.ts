import type { BookmarkRiskLevelValue } from "../types";

export const BOOKMARK_RISK_OPTIONS: Array<{
  value: BookmarkRiskLevelValue;
  label: string;
}> = [
  { value: "unknown", label: "未確認" },
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

export const BOOKMARK_RISK_NOTE_SUGGESTIONS = [
  "炎上リスク",
  "競合ブランド投稿あり",
  "コメント欄ネガティブ多め",
  "フォロワー品質要確認",
  "PR投稿が多い",
  "投稿トーンが不安定",
  "ブランドセーフティ再確認",
] as const;

export const bookmarkRiskLabel = (riskLevel: BookmarkRiskLevelValue) => {
  switch (riskLevel) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    default:
      return "未確認";
  }
};

export const bookmarkRiskClassName = (riskLevel: BookmarkRiskLevelValue) => {
  switch (riskLevel) {
    case "low":
      return "border-[#046307]/30 bg-[#ecfdf5] text-slate-950";
    case "medium":
      return "border-[#D4AF37]/45 bg-[#fffdf7] text-slate-950";
    case "high":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-white text-slate-500";
  }
};
