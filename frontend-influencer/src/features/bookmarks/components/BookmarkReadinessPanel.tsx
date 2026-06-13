import type { BookmarkedInfluencer, BookmarkReadinessValue } from "../types";
import {
  BOOKMARK_READINESS_OPTIONS,
  bookmarkReadinessClassName,
} from "../logic/bookmarkReadiness";

type BookmarkReadinessPanelProps = {
  influencers: BookmarkedInfluencer[];
  selectedReadiness: BookmarkReadinessValue | "all";
  totalCount: number;
  visibleCount: number;
  onSelectReadiness: (readiness: BookmarkReadinessValue | "all") => void;
};

export function BookmarkReadinessPanel({
  influencers,
  selectedReadiness,
  totalCount,
  visibleCount,
  onSelectReadiness,
}: BookmarkReadinessPanelProps) {
  if (totalCount === 0) return null;

  const counts = new Map<BookmarkReadinessValue, number>();

  BOOKMARK_READINESS_OPTIONS.forEach((option) => counts.set(option.value, 0));

  influencers.forEach((influencer) => {
    counts.set(
      influencer.candidateReadiness,
      (counts.get(influencer.candidateReadiness) ?? 0) + 1
    );
  });

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">候補者状況</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            Candidate Readiness
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            進行度ごとに保存候補を整理して、調査対象と連絡対象を切り分けられます。
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
            selectedReadiness === "all"
              ? "border-[#046307]/30 bg-[#ecfdf5] text-slate-950"
              : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
          }`}
          onClick={() => onSelectReadiness("all")}
        >
          すべて
        </button>
        {BOOKMARK_READINESS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`border px-4 py-2 text-sm font-black transition ${
              selectedReadiness === option.value
                ? bookmarkReadinessClassName(option.value)
                : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
            }`}
            onClick={() => onSelectReadiness(option.value)}
          >
            {option.label}
            <span className="ml-2 text-slate-500">({counts.get(option.value) ?? 0})</span>
          </button>
        ))}
      </div>
    </section>
  );
}
