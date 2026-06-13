import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BookmarkRiskLevelValue } from "../types";
import {
  BOOKMARK_RISK_NOTE_SUGGESTIONS,
  BOOKMARK_RISK_OPTIONS,
  bookmarkRiskClassName,
  bookmarkRiskLabel,
} from "../logic/bookmarkRisk";

type BookmarkRiskProfileProps = {
  riskLevel: BookmarkRiskLevelValue;
  riskNotes: string;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSave: (payload: {
    riskLevel: BookmarkRiskLevelValue;
    riskNotes: string;
  }) => Promise<boolean>;
};

export function BookmarkRiskProfile({
  riskLevel,
  riskNotes,
  updating,
  error,
  persistenceReady,
  onSave,
}: BookmarkRiskProfileProps) {
  const [levelDraft, setLevelDraft] = useState(riskLevel);
  const [notesDraft, setNotesDraft] = useState(riskNotes);

  useEffect(() => {
    setLevelDraft(riskLevel);
    setNotesDraft(riskNotes);
  }, [riskLevel, riskNotes]);

  const isDirty = useMemo(
    () => levelDraft !== riskLevel || notesDraft !== riskNotes,
    [levelDraft, notesDraft, riskLevel, riskNotes]
  );

  const toggleSuggestion = (suggestion: string) => {
    const items = notesDraft
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const nextItems = items.includes(suggestion)
      ? items.filter((item) => item !== suggestion)
      : [...items, suggestion];

    setNotesDraft(nextItems.join("\n"));
  };

  return (
    <div
      className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="deco-label">リスクプロファイル</p>
          <p className="mt-1 text-xs text-muted-foreground">
            炎上・競合・品質面の注意点を残せます。
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={updating || !isDirty || !persistenceReady}
          onClick={async () => {
            await onSave({
              riskLevel: levelDraft,
              riskNotes: notesDraft.trim(),
            });
          }}
        >
          {updating ? "保存中..." : "リスクを保存"}
        </Button>
      </div>

      <div
        className={`mt-4 border px-3 py-2 text-xs font-black ${bookmarkRiskClassName(levelDraft)}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="uppercase tracking-[0.16em]">リスクレベル</span>
          <span>{bookmarkRiskLabel(levelDraft)}</span>
        </div>
        <select
          value={levelDraft}
          disabled={updating || !persistenceReady}
          className="mt-2 h-9 w-full border border-slate-300 bg-white px-2 text-xs font-bold text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          onChange={(event) => setLevelDraft(event.target.value as BookmarkRiskLevelValue)}
        >
          {BOOKMARK_RISK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {BOOKMARK_RISK_NOTE_SUGGESTIONS.map((suggestion) => {
          const active = notesDraft.split("\n").map((item) => item.trim()).includes(suggestion);

          return (
            <button
              key={suggestion}
              type="button"
              disabled={updating || !persistenceReady}
              className={`max-w-full break-words border px-3 py-1.5 text-xs font-black transition ${
                active
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-[#D4AF37]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => toggleSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          );
        })}
      </div>

      <textarea
        value={notesDraft}
        disabled={updating || !persistenceReady}
        onChange={(event) => setNotesDraft(event.target.value)}
        className="mt-3 min-h-24 w-full resize-y border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
        placeholder="例: コメント欄ネガティブ多め。競合ブランド投稿あり。"
      />

      {!persistenceReady && (
        <p className="mt-3 text-sm text-slate-700">
          リスク情報を使うには、user_bookmarks の risk_level / risk_notes カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">エラー: {error}</p>}
    </div>
  );
}
