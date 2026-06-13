import type { CampaignPerformanceSummary } from "../types";
import {
  formatPerformanceCurrency,
  formatPerformanceNumber,
  formatPerformancePercent,
} from "../logic/campaignPerformance";

type CampaignPerformancePanelProps = {
  performance: CampaignPerformanceSummary;
  loading: boolean;
};

const performanceItems = (performance: CampaignPerformanceSummary) => [
  {
    label: "想定リーチ",
    value: formatPerformanceNumber(performance.projectedReach),
    description: "候補者の合計フォロワー数",
  },
  {
    label: "候補者数",
    value: formatPerformanceNumber(performance.candidateCount),
    description: `${formatPerformanceNumber(performance.confirmedCount)}人が採用状態`,
  },
  {
    label: "平均フォロワー",
    value: formatPerformanceNumber(performance.averageFollowers),
    description: "候補者1人あたり",
  },
  {
    label: "反応率目安",
    value: formatPerformancePercent(performance.engagementProxyRate),
    description: "最大いいね合計 / フォロワー合計",
  },
  {
    label: "予算 / 候補者",
    value: formatPerformanceCurrency(performance.budgetPerInfluencer),
    description: "予定予算を候補者数で按分",
  },
  {
    label: "予算 / フォロワー",
    value: formatPerformanceCurrency(performance.budgetPerFollower),
    description: "予定予算を想定リーチで按分",
  },
];

export function CampaignPerformancePanel({
  performance,
  loading,
}: CampaignPerformancePanelProps) {
  if (loading) {
    return (
      <section className="deco-panel w-full max-w-none min-w-0">
        <div className="deco-label">パフォーマンス予測</div>
        <p className="mt-3 text-sm text-muted-foreground">候補者データを読み込み中...</p>
      </section>
    );
  }

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <div className="deco-label">パフォーマンス予測</div>
        <p className="deco-copy text-sm">
          候補者のフォロワー、投稿量、最大いいね、予算からキャンペーンの規模感を見積もります。
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {performanceItems(performance).map((item) => (
          <div key={item.label} className="deco-stat min-w-0">
            <div className="deco-label">{item.label}</div>
            <div className="mt-2 break-words text-2xl font-black text-foreground">
              {item.value}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 border-t border-border/60 pt-5 lg:grid-cols-3">
        <div className="deco-stat min-w-0">
          <div className="deco-label">合計投稿数</div>
          <div className="mt-2 text-xl font-black">
            {formatPerformanceNumber(performance.totalPosts)}
          </div>
        </div>
        <div className="deco-stat min-w-0">
          <div className="deco-label">最大いいね合計</div>
          <div className="mt-2 text-xl font-black">
            {formatPerformanceNumber(performance.totalMaxLikes)}
          </div>
        </div>
        <div className="deco-stat min-w-0">
          <div className="deco-label">予定予算</div>
          <div className="mt-2 text-xl font-black">
            {formatPerformanceCurrency(performance.budget)}
          </div>
        </div>
      </div>
    </section>
  );
}
