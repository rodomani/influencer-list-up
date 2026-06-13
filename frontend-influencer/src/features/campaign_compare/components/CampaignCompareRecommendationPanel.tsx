import type { CampaignCompareRecommendation } from "../types";
import {
  formatCompareCurrency,
  formatCompareNumber,
  formatComparePercent,
} from "../logic/campaignCompareFormatters";

type CampaignCompareRecommendationPanelProps = {
  recommendation: CampaignCompareRecommendation | null;
  onOpenCampaign: () => void;
};

export function CampaignCompareRecommendationPanel({
  recommendation,
  onOpenCampaign,
}: CampaignCompareRecommendationPanelProps) {
  if (!recommendation) return null;

  const { row } = recommendation;

  return (
    <section className="grid w-full min-w-0 gap-5 xl:grid-cols-2">
      <article className="border border-[#D4AF37]/40 bg-white p-6 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.35)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="deco-label">おすすめ判断</p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.12em] text-slate-950">
              {row.campaign.name}
            </h2>
            <p className="mt-3 w-full text-sm leading-7 text-muted-foreground">
              予算効率、候補者の準備状況、想定リーチ、納品進捗を合わせて見ると、このキャンペーンが比較対象の中で最も進めやすい状態です。
            </p>
          </div>
          <div className="border border-slate-200 bg-[#f9fafb] px-5 py-4 text-right">
            <p className="deco-label">総合スコア</p>
            <p className="mt-2 text-4xl font-black text-slate-950">{recommendation.score}</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">/ 100</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="border border-slate-200 bg-[#f9fafb] p-4">
            <p className="deco-label">効率</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {row.summary.efficiencyScore}/100
            </p>
          </div>
          <div className="border border-slate-200 bg-[#f9fafb] p-4">
            <p className="deco-label">準備</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {row.summary.readinessScore}/100
            </p>
          </div>
          <div className="border border-slate-200 bg-[#f9fafb] p-4">
            <p className="deco-label">予算使用率</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatComparePercent(row.summary.budgetUtilizationRate)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCampaign}
          className="mt-6 inline-flex h-11 items-center justify-center border border-[#046307]/30 bg-[#046307] px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#035306]"
        >
          詳細を開く
        </button>
      </article>

      <article className="border border-slate-200 bg-white p-6 sm:p-8">
        <p className="deco-label">判断理由</p>
        <div className="mt-5 flex flex-col gap-3">
          {recommendation.reasons.map((reason) => (
            <div key={reason} className="border border-slate-200 bg-[#f9fafb] px-4 py-3">
              <p className="text-sm font-bold leading-6 text-slate-700">{reason}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="deco-label">合計フォロワー</p>
            <p className="mt-2 text-lg font-black text-slate-950">
              {formatCompareNumber(row.summary.totalFollowers)}
            </p>
          </div>
          <div>
            <p className="deco-label">見積合計</p>
            <p className="mt-2 text-lg font-black text-slate-950">
              {formatCompareCurrency(row.summary.assignedCost)}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
