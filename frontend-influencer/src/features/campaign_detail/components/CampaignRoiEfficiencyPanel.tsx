import type { CampaignRoiEfficiency } from "../types";
import {
  formatRoiNumber,
  formatRoiPercent,
} from "../logic/campaignRoiEfficiency";

type CampaignRoiEfficiencyPanelProps = {
  roi: CampaignRoiEfficiency;
  loading: boolean;
};

const scoreTone = (score: number) => {
  if (score >= 75) return "text-[#046307]";
  if (score >= 45) return "text-[#D4AF37]";
  return "text-red-700";
};

const roiItems = (roi: CampaignRoiEfficiency) => [
  {
    label: "フォロワー単価",
    value: formatRoiNumber(roi.costPerFollower),
    description: "費用 / 合計フォロワー",
  },
  {
    label: "反応単価",
    value: formatRoiNumber(roi.costPerMaxLike),
    description: "費用 / 最大いいね合計",
  },
  {
    label: "投稿単価",
    value: formatRoiNumber(roi.costPerPost),
    description: "費用 / 合計投稿数",
  },
  {
    label: "候補者単価",
    value: formatRoiNumber(roi.costPerInfluencer),
    description: "費用 / 候補者数",
  },
  {
    label: "予算使用率",
    value: formatRoiPercent(roi.budgetUtilization),
    description: roi.overBudget ? "予算超過" : "見積合計 / 予定予算",
  },
  {
    label: "見積入力率",
    value: `${roi.dataCompletenessScore}%`,
    description: `${formatRoiNumber(roi.pricedInfluencerCount)} / ${formatRoiNumber(roi.candidateCount)}人`,
  },
];

export function CampaignRoiEfficiencyPanel({
  roi,
  loading,
}: CampaignRoiEfficiencyPanelProps) {
  if (loading) {
    return (
      <section className="deco-panel w-full max-w-none min-w-0">
        <p className="deco-label">ROI / 費用効率</p>
        <p className="mt-3 text-sm text-muted-foreground">費用効率データを読み込み中...</p>
      </section>
    );
  }

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-5">
        <div>
          <p className="deco-label">ROI / 費用効率</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            コスト効率
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            見積金額または予定予算をもとに、フォロワー・投稿・反応見込みあたりの効率を確認できます。
          </p>
        </div>
        <div className="min-w-40 border border-slate-200 bg-[#f9fafb] px-5 py-4 text-right">
          <p className="deco-label">効率スコア</p>
          <p className={`mt-2 text-4xl font-black ${scoreTone(roi.efficiencyScore)}`}>
            {roi.efficiencyScore}
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 w-full overflow-hidden bg-slate-100">
        <div
          className={`h-full transition-all duration-300 ${
            roi.efficiencyScore >= 75
              ? "bg-[#86b89a]"
              : roi.efficiencyScore >= 45
              ? "bg-[#D4AF37]"
              : "bg-red-600"
          }`}
          style={{ width: `${Math.min(Math.max(roi.efficiencyScore, 0), 100)}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roiItems(roi).map((item) => (
          <div key={item.label} className="deco-stat min-w-0">
            <p className="deco-label">{item.label}</p>
            <p className="mt-2 break-words text-2xl font-black text-slate-950">{item.value}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 lg:grid-cols-3">
        <div className="deco-stat min-w-0">
          <p className="deco-label">計算対象費用</p>
          <p className="mt-2 text-xl font-black">{formatRoiNumber(roi.effectiveCost)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            見積入力がある場合は見積合計、ない場合は予定予算を使用
          </p>
        </div>
        <div className="deco-stat min-w-0">
          <p className="deco-label">想定リーチ</p>
          <p className="mt-2 text-xl font-black">{formatRoiNumber(roi.totalFollowers)}</p>
          <p className="mt-1 text-xs text-muted-foreground">候補者の合計フォロワー</p>
        </div>
        <div className="deco-stat min-w-0">
          <p className="deco-label">反応見込み</p>
          <p className="mt-2 text-xl font-black">{formatRoiNumber(roi.totalMaxLikes)}</p>
          <p className="mt-1 text-xs text-muted-foreground">最大いいね合計を代理指標として使用</p>
        </div>
      </div>

      {roi.dataCompletenessScore < 100 && (
        <p className="mt-4 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          まだ見積金額が未入力の候補者があります。全員分を入力すると費用効率の精度が上がります。
        </p>
      )}
    </section>
  );
}
