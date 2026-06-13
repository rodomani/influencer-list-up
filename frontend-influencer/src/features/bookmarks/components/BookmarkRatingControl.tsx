import type { BookmarkRatingValue } from "../types";

type BookmarkRatingControlProps = {
  value: BookmarkRatingValue | null;
  disabled?: boolean;
  onChange: (rating: BookmarkRatingValue | null) => void;
};

const RATING_OPTIONS: BookmarkRatingValue[] = [1, 2, 3, 4, 5];

export function BookmarkRatingControl({
  value,
  disabled = false,
  onChange,
}: BookmarkRatingControlProps) {
  return (
    <div className="border border-slate-200 bg-white px-3 py-2" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          評価
        </span>
        <button
          type="button"
          disabled={disabled || value === null}
          className="text-[11px] font-bold text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onChange(null)}
        >
          クリア
        </button>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {RATING_OPTIONS.map((rating) => {
          const active = (value ?? 0) >= rating;

          return (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              aria-label={`${rating} star rating`}
              aria-pressed={value === rating}
              className={`flex h-9 w-9 items-center justify-center border text-lg transition ${
                active
                  ? "border-[#D4AF37]/60 bg-[#fff7db] text-[#9a6b00]"
                  : "border-slate-200 bg-slate-50 text-slate-300 hover:border-[#D4AF37]/45 hover:text-[#D4AF37]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => onChange(value === rating ? null : rating)}
            >
              ★
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {value ? `${value} / 5 の候補評価` : "未評価"}
      </p>
    </div>
  );
}
