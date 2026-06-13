import type { ComparisonMetric, InfluencerCompareRow } from "../types";
import {
  dataFreshness,
  formatText,
  latestMetrics,
  mostRecentTimestamp,
  timestampToMs,
} from "../logic/compareFormatters";

type CompareTableProps = {
  influencers: InfluencerCompareRow[];
  metrics: ComparisonMetric[];
  bestValues: Map<string, number>;
  bestDates: Map<string, number>;
  onOpenInfluencer: (id: number) => void;
};

export function CompareTable({
  influencers,
  metrics,
  bestValues,
  bestDates,
  onOpenInfluencer,
}: CompareTableProps) {
  return (
    <section className="w-full overflow-hidden border border-slate-200 bg-white shadow-[0_24px_80px_-56px_rgba(15,23,42,0.28)]">
      <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
          比較テーブル
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 w-44 border-r border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                項目
              </th>
              {influencers.map((influencer) => {
                const freshestDate = mostRecentTimestamp(
                  latestMetrics(influencer)?.metric_date,
                  influencer.latest_activity_at,
                  influencer.latest_posted_at,
                  influencer.last_profile_scraped_at
                );
                const freshness = dataFreshness(freshestDate);

                return (
                  <th key={influencer.id} className="min-w-56 px-5 py-5 align-top">
                    <button
                      type="button"
                      data-variant="ghost"
                      className="group flex w-full min-w-0 items-center gap-4 bg-transparent text-left text-slate-950 hover:bg-transparent"
                      onClick={() => onOpenInfluencer(influencer.id)}
                    >
                      {influencer.profile_image_url ? (
                        <img
                          src={influencer.profile_image_url}
                          alt={`${influencer.account_name} profile`}
                          className="h-16 w-16 shrink-0 rounded-full border border-[#D4AF37]/50 object-cover p-1"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black uppercase text-slate-400">
                          {influencer.account_name.slice(0, 1)}
                        </div>
                      )}
                      <span className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#046307]">
                          {influencer.platform}
                        </span>
                        <span className="mt-1 block break-words text-lg font-black uppercase tracking-[0.08em] text-slate-950 group-hover:text-[#046307]">
                          {influencer.account_name}
                        </span>
                      </span>
                    </button>
                    <div className={`mt-4 border px-3 py-2 text-xs font-black ${freshness.className}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="uppercase tracking-[0.14em]">データ鮮度</span>
                        <span>{freshness.label}</span>
                      </div>
                      <div className="mt-1 text-[11px] font-bold opacity-80">
                        {freshness.age}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const bestValue = bestValues.get(metric.label);
              const bestDate = bestDates.get(metric.label);
              return (
                <tr key={metric.label} className="border-b border-slate-200 last:border-b-0">
                  <th className="sticky left-0 z-10 border-r border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    {metric.label}
                  </th>
                  {metric.values.map((value, index) => {
                    const isBest =
                      metric.numeric &&
                      typeof value === "number" &&
                      value === bestValue &&
                      bestValue !== Number.NEGATIVE_INFINITY;
                    const isNewest =
                      metric.date &&
                      typeof value === "string" &&
                      timestampToMs(value) === bestDate &&
                      bestDate !== Number.NEGATIVE_INFINITY;

                    return (
                      <td
                        key={`${metric.label}-${influencers[index]?.id ?? index}`}
                        className={`px-5 py-4 align-top text-sm leading-7 ${
                          isBest || isNewest
                            ? "bg-[#046307]/5 text-slate-950"
                            : "text-slate-700"
                        }`}
                      >
                        <span
                          className={`break-words ${
                            isBest || isNewest
                              ? "border-b border-[#D4AF37] pb-0.5 font-black"
                              : "font-medium"
                          }`}
                        >
                          {metric.format ? metric.format(value) : formatText(value)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
