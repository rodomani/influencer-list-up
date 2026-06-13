import { timestampToMs } from "./formatters";

export const dataFreshness = (value: string | null | undefined) => {
  const time = timestampToMs(value);
  if (time === Number.NEGATIVE_INFINITY) {
    return {
      label: "未取得",
      age: "更新日なし",
      className: "border-slate-200 bg-slate-50 text-slate-500",
      barClassName: "bg-slate-300",
      progress: 8,
    };
  }

  const ageDays = Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
  const age = ageDays === 0 ? "今日更新" : `${new Intl.NumberFormat("ja-JP").format(ageDays)}日前`;

  if (ageDays <= 7) {
    return {
      label: "最新",
      age,
      className: "border-[#046307]/25 bg-[#046307]/5 text-[#046307]",
      barClassName: "bg-[#046307]",
      progress: 100,
    };
  }
  if (ageDays <= 30) {
    return {
      label: "良好",
      age,
      className: "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-slate-900",
      barClassName: "bg-[#D4AF37]",
      progress: 78,
    };
  }
  if (ageDays <= 90) {
    return {
      label: "要確認",
      age,
      className: "border-amber-300 bg-amber-50 text-amber-800",
      barClassName: "bg-amber-500",
      progress: 45,
    };
  }
  return {
    label: "古い",
    age,
    className: "border-red-200 bg-red-50 text-red-700",
    barClassName: "bg-red-500",
    progress: 18,
  };
};
