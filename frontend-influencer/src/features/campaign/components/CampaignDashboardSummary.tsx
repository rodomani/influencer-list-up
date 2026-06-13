import type { CampaignDashboardSummary as CampaignDashboardSummaryType } from "../types";
import { formatCampaignBudget } from "../logic/campaignFormatters";

type CampaignDashboardSummaryProps = {
  loading: boolean;
  campaignCount: number;
  summary: CampaignDashboardSummaryType;
};

const summaryItems = (summary: CampaignDashboardSummaryType) => [
  {
    label: "総キャンペーン",
    value: new Intl.NumberFormat("ja-JP").format(summary.totalCampaigns),
    accent: "text-slate-950",
  },
  {
    label: "進行中",
    value: new Intl.NumberFormat("ja-JP").format(summary.activeCampaigns),
    accent: "text-[#046307]",
  },
  {
    label: "完了",
    value: new Intl.NumberFormat("ja-JP").format(summary.completedCampaigns),
    accent: "text-slate-950",
  },
  {
    label: "予定予算",
    value: formatCampaignBudget(summary.totalBudget),
    accent: "text-slate-950",
  },
  {
    label: "14日以内に終了",
    value: new Intl.NumberFormat("ja-JP").format(summary.endingSoonCampaigns),
    accent: summary.endingSoonCampaigns > 0 ? "text-[#D4AF37]" : "text-slate-950",
  },
  {
    label: "候補者未設定",
    value: new Intl.NumberFormat("ja-JP").format(summary.campaignsWithoutInfluencers),
    accent: summary.campaignsWithoutInfluencers > 0 ? "text-red-700" : "text-slate-950",
  },
];

export function CampaignDashboardSummary({
  loading,
  campaignCount,
  summary,
}: CampaignDashboardSummaryProps) {
  if (loading || campaignCount === 0) return null;

  return (
    <section className="deco-panel">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <div className="deco-label">ダッシュボード概要</div>
        <p className="deco-copy text-sm">
          キャンペーン数、予算、終了が近い案件、候補者未設定の案件をまとめて確認できます。
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryItems(summary).map((item) => (
          <div key={item.label} className="deco-stat min-w-0">
            <div className="deco-label">{item.label}</div>
            <div className={`mt-2 break-words text-2xl font-black ${item.accent}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
