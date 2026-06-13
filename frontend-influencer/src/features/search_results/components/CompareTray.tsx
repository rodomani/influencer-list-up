import { Button } from "@/components/ui/button";
import type { InfluencerNormalized } from "../types";

type CompareTrayProps = {
  selectedForCompare: InfluencerNormalized[];
  compareMinimum: number;
  onCompare: () => void;
  onClear: () => void;
};

export function CompareTray({
  selectedForCompare,
  compareMinimum,
  onCompare,
  onClear,
}: CompareTrayProps) {
  if (selectedForCompare.length === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 border border-slate-200 bg-white p-4 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] sm:inset-x-6 lg:left-auto lg:right-8 lg:w-[min(560px,calc(100vw-4rem))]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">
            比較リスト
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {selectedForCompare.length}人を選択中。比較には最低{compareMinimum}人が必要です。
          </p>
          <div className="mt-2 flex max-w-full flex-wrap gap-2">
            {selectedForCompare.map((influencer) => (
              <span
                key={influencer.id}
                className="max-w-full break-words border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700"
              >
                {influencer.account_name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:w-40">
          <Button
            type="button"
            disabled={selectedForCompare.length < compareMinimum}
            className="h-auto min-h-10 w-full whitespace-normal bg-[#046307] px-3 py-2 text-xs font-black tracking-[0.08em] text-white hover:bg-[#034d06]"
            onClick={onCompare}
          >
            比較する
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 w-full whitespace-normal border-slate-300 bg-white px-3 py-2 text-xs font-black tracking-[0.08em] text-slate-900 hover:border-[#D4AF37]"
            onClick={onClear}
          >
            クリア
          </Button>
        </div>
      </div>
    </div>
  );
}
