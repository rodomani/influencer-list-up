import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BookmarkResearchChecklist } from "../types";

type BookmarkResearchChecklistProps = {
  value: BookmarkResearchChecklist;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSave: (checklist: BookmarkResearchChecklist) => Promise<boolean>;
};

const CHECKLIST_FIELDS: Array<{
  key: keyof BookmarkResearchChecklist;
  label: string;
}> = [
  { key: "profile_checked", label: "プロフィール確認" },
  { key: "latest_posts_checked", label: "最新投稿確認" },
  { key: "comments_checked", label: "コメント確認" },
  { key: "risk_checked", label: "リスク確認" },
  { key: "price_checked", label: "価格確認" },
  { key: "contact_checked", label: "連絡先確認" },
  { key: "audience_fit_checked", label: "オーディエンス適合" },
  { key: "brand_fit_checked", label: "ブランド適合" },
];

export function BookmarkResearchChecklist({
  value,
  updating,
  error,
  persistenceReady,
  onSave,
}: BookmarkResearchChecklistProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const completedCount = useMemo(
    () => CHECKLIST_FIELDS.filter(({ key }) => draft[key]).length,
    [draft]
  );
  const isDirty = useMemo(
    () => CHECKLIST_FIELDS.some(({ key }) => draft[key] !== value[key]),
    [draft, value]
  );

  return (
    <div
      className="border-t border-slate-200 bg-white px-5 py-4 sm:px-7"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="deco-label">リサーチチェックリスト</p>
          <p className="mt-1 text-xs text-muted-foreground">
            調査の進捗を項目ごとに残せます。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            {completedCount} / {CHECKLIST_FIELDS.length}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={updating || !isDirty}
            onClick={async () => {
              await onSave(draft);
            }}
          >
            {updating ? "保存中..." : "チェックを保存"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CHECKLIST_FIELDS.map((field) => (
          <label
            key={field.key}
            className="flex items-center gap-3 border border-slate-200 bg-[#f9fafb] px-3 py-2 text-sm font-bold text-slate-800"
          >
            <input
              type="checkbox"
              checked={draft[field.key]}
              disabled={updating || !persistenceReady}
              className="h-4 w-4 border-slate-300 text-[#046307] focus:ring-[#D4AF37]"
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  [field.key]: event.target.checked,
                }))
              }
            />
            <span>{field.label}</span>
          </label>
        ))}
      </div>

      {!persistenceReady && (
        <p className="mt-3 text-sm text-slate-700">
          チェックリストを使うには、user_bookmarks の research_checklist カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">エラー: {error}</p>}
    </div>
  );
}
