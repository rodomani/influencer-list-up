import { Button } from "@/components/ui/button";
import { formatCampaignStatus } from "@/features/campaign/logic/campaignFormatters";
import type { Campaign } from "../types";

type CampaignDetailHeroProps = {
  campaign: Campaign;
  onBack: () => void;
};

export function CampaignDetailHero({ campaign, onBack }: CampaignDetailHeroProps) {
  return (
    <div className="deco-hero flex w-full max-w-none min-w-0 flex-wrap items-center justify-between gap-6">
      <div>
        <div className="deco-kicker">{formatCampaignStatus(campaign.status)}</div>
        <div className="section-title font-display mt-3">{campaign.name}</div>
        <div className="section-subtitle">
          キャンペーンの期間、予算、目標、選定インフルエンサーを整理しています。
        </div>
      </div>
      <Button variant="outline" onClick={onBack}>
        一覧に戻る
      </Button>
    </div>
  );
}
