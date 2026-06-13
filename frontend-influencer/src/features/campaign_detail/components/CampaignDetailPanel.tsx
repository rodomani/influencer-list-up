import type { Campaign } from "../types";
import { CampaignStatusSelect } from "@/features/campaign/components/CampaignStatusSelect";
import { formatCampaignStatus } from "@/features/campaign/logic/campaignFormatters";
import {
  formatCampaignBudget,
  formatCampaignPeriod,
  formatCampaignValue,
} from "../logic/campaignDetailFormatters";

type CampaignDetailPanelProps = {
  campaign: Campaign;
  statusUpdating: boolean;
  statusError: string | null;
  onStatusChange: (status: string) => void;
};

export function CampaignDetailPanel({
  campaign,
  statusUpdating,
  statusError,
  onStatusChange,
}: CampaignDetailPanelProps) {
  return (
    <div className="deco-panel w-full max-w-none min-w-0">
      {campaign.description && (
        <p className="deco-copy text-base">{campaign.description}</p>
      )}
      <div className="mt-5 grid w-full max-w-none gap-4 xl:grid-cols-4">
        <div className="deco-stat min-w-0">
          <p className="deco-label">期間</p>
          <p className="deco-value text-base">
            {formatCampaignPeriod(campaign.start_date, campaign.end_date)}
          </p>
        </div>
        <div className="deco-stat min-w-0">
          <p className="deco-label">予算</p>
          <p className="deco-value text-base">
            {formatCampaignBudget(campaign.budget)}
          </p>
        </div>
        <div className="deco-stat min-w-0">
          <p className="deco-label">目標</p>
          <p className="deco-value text-base">
            {formatCampaignValue(campaign.goal)}
          </p>
        </div>
        <div className="deco-stat min-w-0">
          <p className="deco-label">ステータス</p>
          <p className="deco-value text-base">
            {formatCampaignStatus(campaign.status)}
          </p>
          <div className="mt-3">
            <CampaignStatusSelect
              value={campaign.status}
              disabled={statusUpdating}
              onChange={onStatusChange}
            />
          </div>
          {statusError && (
            <p className="mt-2 text-xs text-red-600">エラー: {statusError}</p>
          )}
        </div>
      </div>
      <div className="deco-stat mt-4">
        <p className="deco-label">インフルエンサー</p>
        <p className="deco-copy text-sm">
          {formatCampaignValue(campaign.influencers)}
        </p>
      </div>
    </div>
  );
}
