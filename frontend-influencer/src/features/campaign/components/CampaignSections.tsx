import type { Campaign } from "../types";
import { CampaignSection } from "./CampaignSection";

type CampaignSectionsProps = {
  loading: boolean;
  campaignCount: number;
  activeCampaigns: Campaign[];
  completedCampaigns: Campaign[];
  updatingStatusId: number | string | null;
  onOpenCampaign: (campaign: Campaign) => void;
  onStatusChange: (campaign: Campaign, status: string) => void;
};

export function CampaignSections({
  loading,
  campaignCount,
  activeCampaigns,
  completedCampaigns,
  updatingStatusId,
  onOpenCampaign,
  onStatusChange,
}: CampaignSectionsProps) {
  if (loading || campaignCount === 0) return null;

  return (
    <div className="w-full min-w-0 space-y-8">
      <CampaignSection
        title="進行中"
        campaigns={activeCampaigns}
        updatingStatusId={updatingStatusId}
        onOpenCampaign={onOpenCampaign}
        onStatusChange={onStatusChange}
      />
      <CampaignSection
        title="完了"
        campaigns={completedCampaigns}
        compact
        updatingStatusId={updatingStatusId}
        onOpenCampaign={onOpenCampaign}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
