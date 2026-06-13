import type { BookmarkReadinessValue } from "../types";
import {
  BOOKMARK_READINESS_OPTIONS,
  bookmarkReadinessClassName,
} from "../logic/bookmarkReadiness";

type BookmarkReadinessSelectProps = {
  value: BookmarkReadinessValue;
  disabled?: boolean;
  onChange: (readiness: BookmarkReadinessValue) => void;
};

export function BookmarkReadinessSelect({
  value,
  disabled = false,
  onChange,
}: BookmarkReadinessSelectProps) {
  return (
    <div
      className={`border px-3 py-2 text-xs font-black ${bookmarkReadinessClassName(value)}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="uppercase tracking-[0.16em]">候補状況</span>
        <span>{value}</span>
      </div>
      <select
        value={value}
        disabled={disabled}
        className="mt-2 h-9 w-full border border-slate-300 bg-white px-2 text-xs font-bold text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        onChange={(event) => onChange(event.target.value as BookmarkReadinessValue)}
      >
        {BOOKMARK_READINESS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
