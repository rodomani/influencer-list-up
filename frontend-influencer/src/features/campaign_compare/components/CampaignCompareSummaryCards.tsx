import type { CampaignCompareRow } from "../types";
import {
  formatCompareCurrency,
  formatCompareNumber,
  formatComparePercent,
} from "../logic/campaignCompareFormatters";

type CampaignCompareSummaryCardsProps = {
  campaigns: CampaignCompareRow[];
};

export function CampaignCompareSummaryCards({ campaigns }: CampaignCompareSummaryCardsProps) {
  const totalBudget = campaigns.reduce((sum, row) => sum + (row.summary.budget ?? 0), 0);
  const totalFollowers = campaigns.reduce((sum, row) => sum + row.summary.totalFollowers, 0);
  const totalCandidates = campaigns.reduce((sum, row) => sum + row.summary.candidateCount, 0);
  const totalConfirmed = campaigns.reduce((sum, row) => sum + row.summary.confirmedCount, 0);
  const totalMaxLikes = campaigns.reduce((sum, row) => sum + row.summary.totalMaxLikes, 0);
  const engagementProxyRate = totalFollowers > 0 ? totalMaxLikes / totalFollowers : 0;
  const confirmationRate = totalCandidates > 0 ? totalConfirmed / totalCandidates : 0;
  const averageComparisonScore =
    campaigns.length > 0
      ? Math.round(
          campaigns.reduce((sum, row) => sum + row.summary.comparisonScore, 0) / campaigns.length
        )
      : 0;

  const cards = [
    {
      label: "比較件数",
      value: formatCompareNumber(campaigns.length),
      note: "選択中のキャンペーン",
    },
    {
      label: "合計予算",
      value: formatCompareCurrency(totalBudget),
      note: "比較対象の予算合計",
    },
    {
      label: "候補者合計",
      value: formatCompareNumber(totalCandidates),
      note: `採用率 ${formatComparePercent(confirmationRate)}`,
    },
    {
      label: "合計フォロワー",
      value: formatCompareNumber(totalFollowers),
      note: `反応率目安 ${formatComparePercent(engagementProxyRate)}`,
    },
    {
      label: "平均比較スコア",
      value: `${averageComparisonScore} / 100`,
      note: "効率と準備状況の平均",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="deco-panel">
          <p className="deco-label">{card.label}</p>
          <p className="mt-3 text-3xl font-black tracking-[0.08em] text-slate-950">
            {card.value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{card.note}</p>
        </article>
      ))}
    </section>
  );
}
