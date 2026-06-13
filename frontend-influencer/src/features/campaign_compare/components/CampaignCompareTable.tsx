import type { CampaignCompareMetric, CampaignCompareRow } from "../types";
import {
  formatCompareText,
  timestampToMs,
} from "../logic/campaignCompareFormatters";

type CampaignCompareTableProps = {
  campaigns: CampaignCompareRow[];
  metrics: CampaignCompareMetric[];
  bestValues: Map<string, number>;
  bestDates: Map<string, number>;
  onOpenCampaign: (row: CampaignCompareRow) => void;
};

export function CampaignCompareTable({
  campaigns,
  metrics,
  bestValues,
  bestDates,
  onOpenCampaign,
}: CampaignCompareTableProps) {
  return (
    <section className="w-full min-w-0 border border-slate-200 bg-white shadow-[0_24px_80px_-56px_rgba(15,23,42,0.28)]">
      <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
        <p className="deco-label">比較テーブル</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          金額効率の項目は低い値、リーチや進捗の項目は高い値を優位として強調しています。
        </p>
      </div>

      <div className="w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 w-44 border-r border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                項目
              </th>
              {campaigns.map((row) => (
                <th key={row.campaign.id} className="min-w-0 px-5 py-5 align-top">
                  <button
                    type="button"
                    data-variant="ghost"
                    className="group flex w-full min-w-0 flex-col items-start bg-transparent text-left hover:bg-transparent"
                    onClick={() => onOpenCampaign(row)}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#046307]">
                      {row.campaign.status ?? "未設定"}
                    </span>
                    <span className="mt-2 block break-words text-xl font-black uppercase tracking-[0.08em] text-slate-950 group-hover:text-[#046307]">
                      {row.campaign.name}
                    </span>
                    <span className="mt-2 text-xs leading-5 text-muted-foreground">
                      候補者 {row.summary.candidateCount}人 / 採用 {row.summary.confirmedCount}人
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const bestValue = bestValues.get(metric.label);
              const bestDate = bestDates.get(metric.label);

              return (
                <tr key={metric.label} className="border-b border-slate-200 last:border-b-0">
                  <th className="sticky left-0 z-10 border-r border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    <span>{metric.label}</span>
                    {metric.numeric && (
                      <span className="mt-1 block text-[10px] tracking-[0.1em] text-slate-400">
                        {metric.higherIsBetter === false ? "低いほど優位" : "高いほど優位"}
                      </span>
                    )}
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
                        key={`${metric.label}-${campaigns[index]?.campaign.id ?? index}`}
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
                          {metric.format ? metric.format(value) : formatCompareText(value)}
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
