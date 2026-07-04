import { Button } from "@/components/ui/button";

type BookmarkMemoPanelProps = {
  memoDraft: string;
  savedMemo: string;
  updatingMemo: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => Promise<void>;
};

export function BookmarkMemoPanel({
  memoDraft,
  savedMemo,
  updatingMemo,
  onDraftChange,
  onSave,
}: BookmarkMemoPanelProps) {
  return (
    <div
      className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="deco-label">保存理由メモ</p>
          <p className="mt-1 text-xs text-muted-foreground">
            なぜ保存したのか、候補として気になる理由を残せます。
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={updatingMemo || memoDraft.trim() === savedMemo}
          onClick={onSave}
        >
          {updatingMemo ? "保存中..." : "メモを保存"}
        </Button>
      </div>
      <textarea
        value={memoDraft}
        disabled={updatingMemo}
        onChange={(event) => onDraftChange(event.target.value)}
        className="mt-3 min-h-24 w-full resize-y border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
        placeholder="例: コメント品質が高い。美容系キャンペーンで候補にしたい。"
      />
    </div>
  );
}
