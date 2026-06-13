import type { BookmarkedInfluencer, BookmarkRatingValue } from "../types";

type BookmarkRatingPanelProps = {
  influencers: BookmarkedInfluencer[];
  selectedRating: BookmarkRatingValue | "all";
  totalCount: number;
  visibleCount: number;
  onSelectRating: (rating: BookmarkRatingValue | "all") => void;
};

const RATING_OPTIONS: BookmarkRatingValue[] = [5, 4, 3, 2, 1];

export function BookmarkRatingPanel({
  influencers,
  selectedRating,
  totalCount,
  visibleCount,
  onSelectRating,
}: BookmarkRatingPanelProps) {
  if (totalCount === 0) return null;

  const counts = new Map<BookmarkRatingValue, number>();

  RATING_OPTIONS.forEach((rating) => counts.set(rating, 0));

  influencers.forEach((influencer) => {
    if (influencer.personalRating) {
      counts.set(
        influencer.personalRating,
        (counts.get(influencer.personalRating) ?? 0) + 1
      );
    }
  });

  const ratedCount = influencers.filter((influencer) => influencer.personalRating !== null).length;
  const averageRating =
    ratedCount > 0
      ? (
          influencers.reduce(
            (sum, influencer) => sum + (influencer.personalRating ?? 0),
            0
          ) / ratedCount
        ).toFixed(1)
      : null;

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">候補者評価</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            スター評価
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            保存済み候補を 1 から 5 の主観評価で並べ替えずに見分けられます。
          </p>
        </div>
        <div className="grid min-w-[220px] gap-2 border border-slate-200 bg-[#f9fafb] px-4 py-3 text-right">
          <div>
            <p className="deco-label">表示中</p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {visibleCount} / {totalCount}
            </p>
          </div>
          <div>
            <p className="deco-label">平均評価</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {averageRating ? `${averageRating} / 5` : "未評価"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className={`border px-4 py-2 text-sm font-black transition ${
            selectedRating === "all"
              ? "border-[#046307]/30 bg-[#ecfdf5] text-slate-950"
              : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
          }`}
          onClick={() => onSelectRating("all")}
        >
          すべて
        </button>
        {RATING_OPTIONS.map((rating) => (
          <button
            key={rating}
            type="button"
            className={`border px-4 py-2 text-sm font-black transition ${
              selectedRating === rating
                ? "border-[#D4AF37]/55 bg-[#fff7db] text-slate-950"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
            }`}
            onClick={() => onSelectRating(rating)}
          >
            {"★".repeat(rating)}
            <span className="ml-2 text-slate-500">({counts.get(rating) ?? 0})</span>
          </button>
        ))}
      </div>
    </section>
  );
}
