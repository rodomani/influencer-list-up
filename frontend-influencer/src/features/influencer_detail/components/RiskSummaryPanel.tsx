import type { RiskSummary } from "../types";

type RiskSummaryPanelProps = {
  riskSummary: RiskSummary;
};

export function RiskSummaryPanel({ riskSummary }: RiskSummaryPanelProps) {
  return (
    <section className={`border p-5 shadow-[0_18px_70px_-58px_rgba(15,23,42,0.28)] ${riskSummary.className}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.18em]">リスク概要</div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="text-4xl font-black uppercase tracking-[0.08em]">
              {riskSummary.level}
            </div>
            <div className="pb-1 text-sm font-black uppercase tracking-[0.16em] opacity-70">
              {riskSummary.score}/100
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 opacity-85">
            {riskSummary.message}
          </p>
        </div>
        <div className="w-full border border-white/70 bg-white/70 p-4 lg:w-64">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <span>低</span>
            <span>高</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden bg-slate-200">
            <div className={`h-full ${riskSummary.barClassName}`} style={{ width: `${riskSummary.score}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {riskSummary.items.map((item) => (
          <div key={item.label} className="border border-white/70 bg-white/75 p-4 text-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                {item.label}
              </div>
              <div
                className={`border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                  item.level === "高"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : item.level === "中"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : item.level === "不明"
                        ? "border-slate-200 bg-slate-50 text-slate-500"
                        : "border-[#046307]/20 bg-[#046307]/5 text-[#046307]"
                }`}
              >
                {item.level}
              </div>
            </div>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
