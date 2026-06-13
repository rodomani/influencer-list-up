import type { CampaignBudgetAllocation } from "../types";
import {
  formatBudgetNumber,
  formatBudgetPercent,
} from "../logic/campaignBudgetAllocation";

type CampaignBudgetAllocationPanelProps = {
  allocation: CampaignBudgetAllocation;
  loading: boolean;
};

const allocationItems = (allocation: CampaignBudgetAllocation) => [
  {
    label: "予定予算",
    value: formatBudgetNumber(allocation.budget),
    tone: "text-foreground",
  },
  {
    label: "割当済み費用",
    value: formatBudgetNumber(allocation.assignedCost),
    tone: "text-foreground",
  },
  {
    label: "残予算",
    value: formatBudgetNumber(allocation.remainingBudget),
    tone: allocation.overBudget ? "text-red-700" : "text-[#046307]",
  },
  {
    label: "平均費用",
    value: formatBudgetNumber(allocation.averageCostPerInfluencer),
    tone: "text-foreground",
  },
  {
    label: "割当率",
    value: formatBudgetPercent(allocation.allocationRate),
    tone: allocation.overBudget ? "text-red-700" : "text-[#D4AF37]",
  },
  {
    label: "未入力候補者",
    value: formatBudgetNumber(allocation.unpricedInfluencerCount),
    tone: allocation.unpricedInfluencerCount > 0 ? "text-red-700" : "text-[#046307]",
  },
];

export function CampaignBudgetAllocationPanel({
  allocation,
  loading,
}: CampaignBudgetAllocationPanelProps) {
  if (loading) {
    return (
      <section className="deco-panel w-full max-w-none min-w-0">
        <div className="deco-label">予算配分</div>
        <p className="mt-3 text-sm text-muted-foreground">予算データを読み込み中...</p>
      </section>
    );
  }

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <div className="deco-label">予算配分</div>
        <p className="deco-copy text-sm">
          候補者ごとの見積金額から、割当済み費用、残予算、平均費用を確認できます。
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {allocationItems(allocation).map((item) => (
          <div key={item.label} className="deco-stat min-w-0">
            <div className="deco-label">{item.label}</div>
            <div className={`mt-2 break-words text-2xl font-black ${item.tone}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 h-2 overflow-hidden bg-muted">
        <div
          className={allocation.overBudget ? "h-full bg-red-600" : "h-full bg-[#046307]"}
          style={{
            width: `${Math.min(Math.max((allocation.allocationRate ?? 0) * 100, 0), 100)}%`,
          }}
        />
      </div>

      {allocation.overBudget && (
        <p className="mt-3 text-sm font-bold text-red-700">
          予定予算を超えています。見積金額または候補者数を調整してください。
        </p>
      )}
      {!allocation.overBudget && allocation.unpricedInfluencerCount > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          未入力の候補者に見積金額を入れると、配分精度が上がります。
        </p>
      )}
    </section>
  );
}
