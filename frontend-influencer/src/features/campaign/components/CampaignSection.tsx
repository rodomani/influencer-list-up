import type { Campaign } from "../types";
import { CampaignCard } from "./CampaignCard";

type CampaignSectionProps = {
  title: string;
  campaigns: Campaign[];
  compact?: boolean;
  updatingStatusId: number | string | null;
  onOpenCampaign: (campaign: Campaign) => void;
  onStatusChange: (campaign: Campaign, status: string) => void;
};

export function CampaignSection({
  title,
  campaigns,
  compact = false,
  updatingStatusId,
  onOpenCampaign,
  onStatusChange,
}: CampaignSectionProps) {
  return (
    <section className="w-full min-w-0 space-y-3">
      <h2 className="section-title">{title}</h2>
      <div className="grid w-full min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            compact={compact}
            statusUpdating={updatingStatusId === campaign.id}
            onOpen={onOpenCampaign}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </section>
  );
}
