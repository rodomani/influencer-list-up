import type { BookmarkPriorityValue } from "../types";
import {
  BOOKMARK_PRIORITY_OPTIONS,
  bookmarkPriorityClassName,
  bookmarkPriorityLabel,
} from "../logic/bookmarkPriority";

type BookmarkPriorityPanelProps = {
  selectedPriority: BookmarkPriorityValue | "all";
  totalCount: number;
  visibleCount: number;
  error: string | null;
  persistenceReady: boolean;
  onSelectPriority: (priority: BookmarkPriorityValue | "all") => void;
};

export function BookmarkPriorityPanel({
  selectedPriority,
  totalCount,
  visibleCount,
  error,
  persistenceReady,
  onSelectPriority,
}: BookmarkPriorityPanelProps) {
  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">ショートリスト優先度</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            候補者の重要度
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            キャンペーンに入れる前の研究段階で、保存候補を高・中・低に分けて整理できます。
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
            selectedPriority === "all"
              ? "border-[#046307]/30 bg-[#ecfdf5] text-slate-950"
              : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
          }`}
          onClick={() => onSelectPriority("all")}
        >
          すべて
        </button>
        {BOOKMARK_PRIORITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`border px-4 py-2 text-sm font-black transition ${
              selectedPriority === option.value
                ? bookmarkPriorityClassName(option.value)
                : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
            }`}
            onClick={() => onSelectPriority(option.value)}
          >
            優先度 {bookmarkPriorityLabel(option.value)}
          </button>
        ))}
      </div>

      {!persistenceReady && (
        <p className="mt-3 border border-[#D4AF37]/40 bg-[#fffdf7] px-3 py-2 text-sm text-slate-700">
          優先度を保存するには、user_bookmarks の priority カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && (
        <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          エラー: {error}
        </p>
      )}
    </section>
  );
}
