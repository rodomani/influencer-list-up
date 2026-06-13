import type { InfluencerCompareRow } from "../types";
import { formatDateYmd, formatMetric, latestMetrics, timestampToMs } from "../logic/compareFormatters";

type CompareSummaryCardsProps = {
  influencers: InfluencerCompareRow[];
};

export function CompareSummaryCards({ influencers }: CompareSummaryCardsProps) {
  const strongestReach = influencers
    .slice()
    .sort((a, b) => (latestMetrics(b)?.followers ?? 0) - (latestMetrics(a)?.followers ?? 0))[0];
  const latestActivity = influencers
    .map((influencer) => influencer.latest_activity_at)
    .sort((a, b) => timestampToMs(b) - timestampToMs(a))[0];

  return (
    <section className="grid gap-4 lg:grid-cols-4">
      <div className="border border-slate-200 bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">
          比較人数
        </p>
        <p className="mt-2 text-3xl font-black text-slate-950">{influencers.length}</p>
      </div>
      <div className="border border-slate-200 bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">
          合計フォロワー
        </p>
        <p className="mt-2 text-3xl font-black text-slate-950">
          {formatMetric(
            influencers.reduce(
              (sum, influencer) => sum + (latestMetrics(influencer)?.followers ?? 0),
              0
            )
          )}
        </p>
      </div>
      <div className="border border-slate-200 bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">
          最大リーチ候補
        </p>
        <p className="mt-2 break-words text-xl font-black uppercase tracking-[0.08em] text-slate-950">
          {strongestReach?.account_name ?? "未設定"}
        </p>
      </div>
      <div className="border border-slate-200 bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">
          最新活動日
        </p>
        <p className="mt-2 text-3xl font-black text-slate-950">
          {formatDateYmd(latestActivity)}
        </p>
      </div>
    </section>
  );
}
