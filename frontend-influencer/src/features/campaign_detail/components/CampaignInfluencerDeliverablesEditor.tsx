import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CampaignInfluencer } from "../types";
import {
  CAMPAIGN_DELIVERABLE_STATUS_OPTIONS,
  campaignDeliverableStatusLabel,
} from "../logic/campaignDeliverables";

type CampaignInfluencerDeliverablesEditorProps = {
  influencer: CampaignInfluencer;
  disabled: boolean;
  onSave: (payload: {
    relationId: number;
    deliverables: string;
    deliverableStatus: string;
    deliverableDueDate: string | null;
  }) => void;
};

export function CampaignInfluencerDeliverablesEditor({
  influencer,
  disabled,
  onSave,
}: CampaignInfluencerDeliverablesEditorProps) {
  const [deliverables, setDeliverables] = useState(influencer.deliverables ?? "");
  const [deliverableStatus, setDeliverableStatus] = useState(
    influencer.deliverable_status ?? "not_started"
  );
  const [deliverableDueDate, setDeliverableDueDate] = useState(
    influencer.deliverable_due_date ?? ""
  );

  useEffect(() => {
    setDeliverables(influencer.deliverables ?? "");
    setDeliverableStatus(influencer.deliverable_status ?? "not_started");
    setDeliverableDueDate(influencer.deliverable_due_date ?? "");
  }, [
    influencer.id,
    influencer.deliverables,
    influencer.deliverable_status,
    influencer.deliverable_due_date,
  ]);

  return (
    <div className="mt-4 w-full min-w-0 border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="deco-label">納品物</p>
          <p className="mt-1 text-xs text-muted-foreground">
            現在: {campaignDeliverableStatusLabel(deliverableStatus)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          入力後に保存ボタンを押してください。
        </p>
      </div>

      <div className="mt-4 grid w-full min-w-0 gap-3 lg:grid-cols-3">
        <div>
          <label htmlFor={`deliverables-${influencer.id}`} className="deco-label">
            内容
          </label>
          <textarea
            id={`deliverables-${influencer.id}`}
            value={deliverables}
            disabled={disabled}
            onChange={(event) => setDeliverables(event.target.value)}
            className="mt-2 min-h-24 w-full border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            placeholder="例: TikTok動画1本、Instagramストーリー2本"
          />
        </div>
        <div>
          <label htmlFor={`deliverable-status-${influencer.id}`} className="deco-label">
            状態
          </label>
          <select
            id={`deliverable-status-${influencer.id}`}
            value={deliverableStatus}
            disabled={disabled}
            onChange={(event) => setDeliverableStatus(event.target.value)}
            className="mt-2 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          >
            {CAMPAIGN_DELIVERABLE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`deliverable-due-date-${influencer.id}`} className="deco-label">
            期限
          </label>
          <Input
            id={`deliverable-due-date-${influencer.id}`}
            type="date"
            value={deliverableDueDate}
            disabled={disabled}
            className="mt-2"
            onChange={(event) => setDeliverableDueDate(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex w-full justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            onSave({
              relationId: influencer.id,
              deliverables,
              deliverableStatus,
              deliverableDueDate: deliverableDueDate || null,
            })
          }
        >
          {disabled ? "保存中..." : "納品情報を保存"}
        </Button>
      </div>
    </div>
  );
}
