import { Button } from "@/components/ui/button";
import type {
  Campaign,
  CampaignBudgetAllocation,
  CampaignCalendarEvent,
  CampaignInfluencer,
  CampaignPerformanceSummary,
  CampaignRoiEfficiency,
  CampaignTask,
} from "../types";
import {
  buildCampaignReportCsv,
  buildCampaignReportHighlights,
  campaignReportFileName,
  downloadCampaignReportCsv,
} from "../logic/campaignReport";
import { campaignDeliverableStatusLabel } from "../logic/campaignDeliverables";
import {
  campaignInfluencerStatusLabel,
  latestCampaignInfluencerMetric,
} from "../logic/campaignInfluencerFormatters";
import { formatRoiNumber } from "../logic/campaignRoiEfficiency";

type CampaignReportPanelProps = {
  campaign: Campaign;
  performance: CampaignPerformanceSummary;
  allocation: CampaignBudgetAllocation;
  roi: CampaignRoiEfficiency;
  influencers: CampaignInfluencer[];
  tasks: CampaignTask[];
  events: CampaignCalendarEvent[];
};

export function CampaignReportPanel({
  campaign,
  performance,
  allocation,
  roi,
  influencers,
  tasks,
  events,
}: CampaignReportPanelProps) {
  const highlights = buildCampaignReportHighlights({
    campaign,
    performance,
    allocation,
    roi,
    tasks,
  });

  const handleDownloadCsv = () => {
    downloadCampaignReportCsv(
      campaignReportFileName(campaign),
      buildCampaignReportCsv({
        campaign,
        performance,
        allocation,
        roi,
        influencers,
        tasks,
        events,
      })
    );
  };

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">レポート</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            キャンペーン報告
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            予算、ROI、候補者、納品、タスク、予定をまとめた共有用レポートです。
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button className="w-full sm:w-auto" type="button" onClick={handleDownloadCsv}>
            CSV出力
          </Button>
          <Button
            className="w-full sm:w-auto"
            type="button"
            variant="outline"
            onClick={() => window.print()}
          >
            印刷 / PDF
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.label} className="deco-stat min-w-0">
            <p className="deco-label">{item.label}</p>
            <p className="mt-2 break-words text-2xl font-black text-slate-950">{item.value}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid w-full min-w-0 gap-5 xl:grid-cols-2">
        <div className="min-w-0 border border-slate-200 bg-[#f9fafb] p-4">
          <p className="deco-label">候補者サマリー</p>
          <div className="mt-4 w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  <th className="py-3 pr-3">名前</th>
                  <th className="py-3 pr-3">状態</th>
                  <th className="py-3 pr-3">見積</th>
                  <th className="py-3 pr-3">納品</th>
                  <th className="py-3 pr-3">期限</th>
                  <th className="py-3 pr-3">フォロワー</th>
                </tr>
              </thead>
              <tbody>
                {influencers.map((influencer) => {
                  const metrics = latestCampaignInfluencerMetric(
                    influencer.account?.accounts_metrics
                  );

                  return (
                    <tr key={influencer.id} className="border-b border-slate-200 last:border-0">
                      <td className="py-3 pr-3 font-black text-slate-950">
                        {influencer.account?.account_name ?? `ID:${influencer.account_id}`}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {campaignInfluencerStatusLabel(influencer.status)}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {formatRoiNumber(influencer.quoted_price)}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {campaignDeliverableStatusLabel(influencer.deliverable_status)}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {influencer.deliverable_due_date ?? "未設定"}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {formatRoiNumber(metrics?.followers ?? null)}
                      </td>
                    </tr>
                  );
                })}
                {influencers.length === 0 && (
                  <tr>
                    <td className="py-4 text-sm text-muted-foreground" colSpan={6}>
                      候補者がまだ登録されていません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="border border-slate-200 bg-[#f9fafb] p-4">
            <p className="deco-label">未完了タスク</p>
            <div className="mt-3 space-y-2">
              {tasks.filter((task) => !task.completed).map((task) => (
                <div key={task.id} className="border border-slate-200 bg-white p-3 text-sm">
                  {task.title}
                </div>
              ))}
              {tasks.every((task) => task.completed) && (
                <p className="text-sm text-muted-foreground">未完了タスクはありません。</p>
              )}
            </div>
          </div>

          <div className="border border-slate-200 bg-[#f9fafb] p-4">
            <p className="deco-label">次の予定</p>
            <div className="mt-3 space-y-2">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="border border-slate-200 bg-white p-3">
                  <p className="text-xs font-black text-[#D4AF37]">{event.date}</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{event.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground">予定はまだありません。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
