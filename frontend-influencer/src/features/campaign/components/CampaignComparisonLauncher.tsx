import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Campaign } from "../types";
import {
  formatCampaignBudget,
  formatCampaignPeriod,
  formatCampaignStatus,
} from "../logic/campaignFormatters";

type CampaignComparisonLauncherProps = {
  campaigns: Campaign[];
  loading: boolean;
  onCompare: (campaignIds: string[]) => void;
};

export function CampaignComparisonLauncher({
  campaigns,
  loading,
  onCompare,
}: CampaignComparisonLauncherProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (loading || campaigns.length < 2) return null;

  const toggleCampaign = (campaignId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(campaignId)) return prev.filter((id) => id !== campaignId);
      if (prev.length >= 4) return prev;
      return [...prev, campaignId];
    });
  };

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">キャンペーン比較</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            比較するキャンペーンを選択
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            2件から4件まで選択して、予算・候補者・想定リーチを横並びで比較できます。
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={selectedIds.length < 2}
          onClick={() => onCompare(selectedIds)}
        >
          {selectedIds.length < 2 ? "2件以上選択" : `${selectedIds.length}件を比較`}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {campaigns.map((campaign) => {
          const campaignId = String(campaign.id);
          const selected = selectedIds.includes(campaignId);
          const disabled = !selected && selectedIds.length >= 4;

          return (
            <button
              key={campaign.id}
              type="button"
              disabled={disabled}
              className={`min-w-0 border p-4 text-left transition !text-slate-950 ${
                selected
                  ? "border-[#a7f3d0] !bg-[#ecfdf5] ring-2 ring-[#a7f3d0]/40"
                  : "border-slate-200 !bg-white hover:border-[#D4AF37]/70 hover:!bg-[#fffdf7]"
              } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
              onClick={() => toggleCampaign(campaignId)}
            >
              <span className="deco-label">{formatCampaignStatus(campaign.status)}</span>
              <span className="mt-2 block break-words text-base font-black uppercase tracking-[0.08em] !text-slate-950">
                {campaign.name}
              </span>
              <span className="mt-3 block text-xs leading-5 text-muted-foreground">
                {formatCampaignPeriod(campaign)}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                予算: {formatCampaignBudget(campaign.budget)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
