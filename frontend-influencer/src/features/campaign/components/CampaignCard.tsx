import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Campaign } from "../types";
import {
  formatCampaignBudget,
  formatCampaignPeriod,
  formatCampaignValue,
  formatCampaignStatus,
} from "../logic/campaignFormatters";
import { CampaignStatusSelect } from "./CampaignStatusSelect";

type CampaignCardProps = {
  campaign: Campaign;
  compact?: boolean;
  statusUpdating?: boolean;
  onOpen: (campaign: Campaign) => void;
  onStatusChange: (campaign: Campaign, status: string) => void;
};

export function CampaignCard({
  campaign,
  compact = false,
  statusUpdating = false,
  onOpen,
  onStatusChange,
}: CampaignCardProps) {
  return (
    <Card
      className="deco-motion w-full min-w-0 cursor-pointer"
      onClick={() => onOpen(campaign)}
    >
      <CardHeader>
        <CardTitle className="text-lg font-display">{campaign.name}</CardTitle>
        <div className="flex flex-col gap-2">
          <p className="deco-chip w-fit">{formatCampaignStatus(campaign.status)}</p>
          <div onClick={(event) => event.stopPropagation()}>
            <CampaignStatusSelect
              value={campaign.status}
              disabled={statusUpdating}
              onChange={(status) => onStatusChange(campaign, status)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "space-y-2" : "space-y-4"}>
        {campaign.description && (
          <p className="deco-copy text-sm">{campaign.description}</p>
        )}
        {compact ? (
          <>
            <p className="text-xs text-muted-foreground">
              {formatCampaignPeriod(campaign)}
            </p>
            {campaign.budget !== null && (
              <p className="text-xs text-muted-foreground">
                予算: {formatCampaignBudget(campaign.budget)}
              </p>
            )}
            {campaign.goal && (
              <p className="text-xs text-muted-foreground">
                目標: {campaign.goal}
              </p>
            )}
          </>
        ) : (
          <div className="deco-grid">
            <div className="deco-stat min-w-0">
              <div className="deco-label">期間</div>
              <div className="text-sm text-foreground">{formatCampaignPeriod(campaign)}</div>
            </div>
            <div className="deco-stat min-w-0">
              <div className="deco-label">予算</div>
              <div className="text-sm text-foreground">{formatCampaignBudget(campaign.budget)}</div>
            </div>
            <div className="deco-stat min-w-0">
              <div className="deco-label">目標</div>
              <div className="text-sm text-foreground">{formatCampaignValue(campaign.goal)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
