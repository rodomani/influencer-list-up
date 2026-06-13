import type { BookmarkedInfluencer, BookmarkRiskLevelValue } from "../types";
import {
  BOOKMARK_RISK_OPTIONS,
  bookmarkRiskClassName,
  bookmarkRiskLabel,
} from "../logic/bookmarkRisk";

type BookmarkRiskPanelProps = {
  influencers: BookmarkedInfluencer[];
  selectedRiskLevel: BookmarkRiskLevelValue | "all";
  totalCount: number;
  visibleCount: number;
  onSelectRiskLevel: (riskLevel: BookmarkRiskLevelValue | "all") => void;
};

export function BookmarkRiskPanel({
  influencers,
  selectedRiskLevel,
  totalCount,
  visibleCount,
  onSelectRiskLevel,
}: BookmarkRiskPanelProps) {
  if (totalCount === 0) return null;

  const counts = new Map<BookmarkRiskLevelValue, number>();
  BOOKMARK_RISK_OPTIONS.forEach((option) => counts.set(option.value, 0));

  influencers.forEach((influencer) => {
    counts.set(
      influencer.riskLevel,
      (counts.get(influencer.riskLevel) ?? 0) + 1
    );
  });

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">リスク確認</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            Risk Profile
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            保存候補を炎上・競合・品質リスクの観点で仕分けできます。
          </p>
        </div>
        <div className="border border-slate-200 bg-[#f9fafb] px-4 py-3 text-right">
          <p className="deco-label">表示中</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {visibleCount} / {totalCount}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className={`border px-4 py-2 text-sm font-black transition ${
            selectedRiskLevel === "all"
              ? "border-[#046307]/30 bg-[#ecfdf5] text-slate-950"
              : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
          }`}
          onClick={() => onSelectRiskLevel("all")}
        >
          すべて
        </button>
        {BOOKMARK_RISK_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`border px-4 py-2 text-sm font-black transition ${
              selectedRiskLevel === option.value
                ? bookmarkRiskClassName(option.value)
                : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
            }`}
            onClick={() => onSelectRiskLevel(option.value)}
          >
            リスク {bookmarkRiskLabel(option.value)}
            <span className="ml-2 text-slate-500">({counts.get(option.value) ?? 0})</span>
          </button>
        ))}
      </div>
    </section>
  );
}
