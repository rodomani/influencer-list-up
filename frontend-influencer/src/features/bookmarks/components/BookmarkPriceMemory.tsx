import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BookmarkPriceMemory as BookmarkPriceMemoryValue } from "../types";
import { formatBookmarkDateTime } from "../logic/bookmarkFormatters";

type BookmarkPriceMemoryProps = {
  value: BookmarkPriceMemoryValue;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSave: (priceMemory: {
    estimated_price_min: number | null;
    estimated_price_max: number | null;
    price_note: string;
  }) => Promise<boolean>;
};

const parseNumericDraft = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export function BookmarkPriceMemory({
  value,
  updating,
  error,
  persistenceReady,
  onSave,
}: BookmarkPriceMemoryProps) {
  const [minDraft, setMinDraft] = useState(value.estimated_price_min?.toString() ?? "");
  const [maxDraft, setMaxDraft] = useState(value.estimated_price_max?.toString() ?? "");
  const [noteDraft, setNoteDraft] = useState(value.price_note);

  useEffect(() => {
    setMinDraft(value.estimated_price_min?.toString() ?? "");
    setMaxDraft(value.estimated_price_max?.toString() ?? "");
    setNoteDraft(value.price_note);
  }, [value]);

  const parsedMin = parseNumericDraft(minDraft);
  const parsedMax = parseNumericDraft(maxDraft);
  const isDirty = useMemo(
    () =>
      parsedMin !== value.estimated_price_min ||
      parsedMax !== value.estimated_price_max ||
      noteDraft !== value.price_note,
    [noteDraft, parsedMax, parsedMin, value]
  );

  return (
    <div
      className="border-t border-slate-200 bg-white px-5 py-4 sm:px-7"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="deco-label">価格メモ</p>
          <p className="mt-1 text-xs text-muted-foreground">
            想定報酬レンジとメモを保存できます。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            確認日時: {formatBookmarkDateTime(value.price_checked_at)}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={updating || !isDirty || !persistenceReady}
            onClick={async () => {
              await onSave({
                estimated_price_min: parsedMin,
                estimated_price_max: parsedMax,
                price_note: noteDraft.trim(),
              });
            }}
          >
            {updating ? "保存中..." : "価格メモを保存"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          <span>想定下限</span>
          <input
            type="number"
            inputMode="decimal"
            value={minDraft}
            disabled={updating || !persistenceReady}
            onChange={(event) => setMinDraft(event.target.value)}
            className="h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            placeholder="例: 500000"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          <span>想定上限</span>
          <input
            type="number"
            inputMode="decimal"
            value={maxDraft}
            disabled={updating || !persistenceReady}
            onChange={(event) => setMaxDraft(event.target.value)}
            className="h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            placeholder="例: 1200000"
          />
        </label>
      </div>

      <textarea
        value={noteDraft}
        disabled={updating || !persistenceReady}
        onChange={(event) => setNoteDraft(event.target.value)}
        className="mt-3 min-h-24 w-full resize-y border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
        placeholder="例: 直近案件の相場感。投稿本数により変動。"
      />

      {!persistenceReady && (
        <p className="mt-3 text-sm text-slate-700">
          価格メモを使うには、user_bookmarks の estimated_price_min / estimated_price_max / price_note / price_checked_at カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">エラー: {error}</p>}
    </div>
  );
}
