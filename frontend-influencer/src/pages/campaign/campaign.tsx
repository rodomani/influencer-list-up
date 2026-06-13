import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaigns } from "@/features/campaign/api/useCampaigns";
import { CampaignDashboardSummary } from "@/features/campaign/components/CampaignDashboardSummary";
import { CampaignHero } from "@/features/campaign/components/CampaignHero";
import { CampaignComparisonLauncher } from "@/features/campaign/components/CampaignComparisonLauncher";
import { CampaignSections } from "@/features/campaign/components/CampaignSections";
import { CampaignStatusMessages } from "@/features/campaign/components/CampaignStatusMessages";
import type { Campaign } from "@/features/campaign/types";

export function CampaignScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const campaignState = useCampaigns(user?.id);

  const openCampaign = (campaign: Campaign) => {
    navigate("/campaign/detail", { state: { campaign } });
  };

  return (
    <div className="-mx-4 -my-5 flex min-h-screen w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-7 overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-8 lg:w-[calc(100%+4rem)] lg:px-8">
      <CampaignHero onCreate={() => navigate("/campaign/create")} />

      <CampaignStatusMessages
        loading={campaignState.loading}
        error={campaignState.error}
        campaignCount={campaignState.campaigns.length}
      />

      <CampaignDashboardSummary
        loading={campaignState.loading}
        campaignCount={campaignState.campaigns.length}
        summary={campaignState.dashboardSummary}
      />

      <CampaignComparisonLauncher
        campaigns={campaignState.campaigns}
        loading={campaignState.loading}
        onCompare={(campaignIds) => navigate(`/campaign/compare?ids=${campaignIds.join(",")}`)}
      />

      <CampaignSections
        loading={campaignState.loading}
        campaignCount={campaignState.campaigns.length}
        activeCampaigns={campaignState.activeCampaigns}
        completedCampaigns={campaignState.completedCampaigns}
        updatingStatusId={campaignState.updatingStatusId}
        onOpenCampaign={openCampaign}
        onStatusChange={campaignState.handleStatusChange}
      />
    </div>
  );
}
