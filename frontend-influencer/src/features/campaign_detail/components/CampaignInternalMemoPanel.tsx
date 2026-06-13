import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Campaign } from "../types";

type CampaignInternalMemoPanelProps = {
  campaign: Campaign;
  saving: boolean;
  error: string | null;
  onSave: (internalMemo: string) => void;
};

export function CampaignInternalMemoPanel({
  campaign,
  saving,
  error,
  onSave,
}: CampaignInternalMemoPanelProps) {
  const [memo, setMemo] = useState(campaign.internal_memo ?? "");

  useEffect(() => {
    setMemo(campaign.internal_memo ?? "");
  }, [campaign.id, campaign.internal_memo]);

  const hasChanges = memo !== (campaign.internal_memo ?? "");

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="deco-label">社内メモ</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            キャンペーン記録
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            交渉状況、社内判断、次回確認事項をキャンペーン単位で残せます。
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={saving || !hasChanges}
          onClick={() => onSave(memo)}
        >
          {saving ? "保存中..." : "メモを保存"}
        </Button>
      </div>

      <div className="mt-5 border border-slate-200 bg-[#f9fafb] p-4">
        <textarea
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          className="min-h-44 w-full resize-y border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          placeholder="例: 初回連絡済み。返信率は良好。見積確認後、投稿形式と納品日を確定する。"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{memo.length.toLocaleString("ja-JP")}文字</span>
          <span>{hasChanges ? "未保存の変更があります。" : "保存済みです。"}</span>
        </div>
      </div>

      {error && (
        <p className="mt-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          エラー: {error}
        </p>
      )}
    </section>
  );
}
