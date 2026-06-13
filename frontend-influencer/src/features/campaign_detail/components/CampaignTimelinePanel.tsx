import type { CampaignTimelineItem } from "../types";
import { formatTimelineDate } from "../logic/campaignTimeline";

type CampaignTimelinePanelProps = {
  timeline: CampaignTimelineItem[];
  loading: boolean;
};

const statusClassName = (status: CampaignTimelineItem["status"]) => {
  switch (status) {
    case "done":
      return "border-[#046307]/35 bg-[#046307]/5 text-[#046307]";
    case "current":
      return "border-[#D4AF37]/45 bg-[#D4AF37]/10 text-slate-950";
    case "upcoming":
      return "border-slate-200 bg-white text-slate-700";
    case "missing":
    default:
      return "border-slate-200 bg-slate-50 text-slate-400";
  }
};

const statusLabel = (status: CampaignTimelineItem["status"]) => {
  switch (status) {
    case "done":
      return "完了";
    case "current":
      return "本日付近";
    case "upcoming":
      return "予定";
    case "missing":
    default:
      return "未設定";
  }
};

export function CampaignTimelinePanel({
  timeline,
  loading,
}: CampaignTimelinePanelProps) {
  if (loading) {
    return (
      <section className="deco-panel w-full max-w-none min-w-0">
        <div className="deco-label">タイムライン</div>
        <p className="mt-3 text-sm text-muted-foreground">タイムラインを読み込み中...</p>
      </section>
    );
  }

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <div className="deco-label">タイムライン</div>
        <p className="deco-copy text-sm">
          作成、候補者追加、連絡、採用、開始、中間確認、終了までの流れを確認できます。
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {timeline.map((item, index) => (
          <div key={item.key} className="grid gap-3 sm:grid-cols-[48px_1fr]">
            <div className="hidden flex-col items-center sm:flex">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black ${statusClassName(item.status)}`}
              >
                {index + 1}
              </div>
              {index < timeline.length - 1 && <div className="h-full min-h-8 w-px bg-border" />}
            </div>
            <article className={`border p-4 ${statusClassName(item.status)}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em]">
                    {item.label}
                  </div>
                  <div className="mt-2 text-xl font-black">
                    {formatTimelineDate(item.date)}
                  </div>
                  <p className="mt-2 text-sm leading-6 opacity-80">{item.description}</p>
                </div>
                <span className="w-fit border border-current px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                  {statusLabel(item.status)}
                </span>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
