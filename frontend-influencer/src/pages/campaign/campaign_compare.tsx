import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaignCompare } from "@/features/campaign_compare/api/useCampaignCompare";
import { CampaignCompareHero } from "@/features/campaign_compare/components/CampaignCompareHero";
import { CampaignCompareRecommendationPanel } from "@/features/campaign_compare/components/CampaignCompareRecommendationPanel";
import { CampaignCompareStatus } from "@/features/campaign_compare/components/CampaignCompareStatus";
import { CampaignCompareSummaryCards } from "@/features/campaign_compare/components/CampaignCompareSummaryCards";
import { CampaignCompareTable } from "@/features/campaign_compare/components/CampaignCompareTable";
import type { CampaignCompareRow } from "@/features/campaign_compare/types";

export function CampaignComparePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const compare = useCampaignCompare(searchParams.get("ids"), user?.id);

  const openCampaign = (row: CampaignCompareRow) => {
    navigate("/campaign/detail", { state: { campaign: row.campaign } });
  };

  return (
    <div className="-mx-4 -my-5 flex min-h-screen w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-7 overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-8 lg:w-[calc(100%+4rem)] lg:px-8">
      <CampaignCompareHero
        comparedCount={compare.campaigns.length}
        onBack={() => navigate("/campaign")}
      />
      <CampaignCompareStatus loading={compare.loading} error={compare.error} />

      {!compare.loading && !compare.error && compare.campaigns.length > 0 && (
        <>
          <CampaignCompareSummaryCards campaigns={compare.campaigns} />
          <CampaignCompareRecommendationPanel
            recommendation={compare.recommendation}
            onOpenCampaign={() => {
              if (compare.recommendation) openCampaign(compare.recommendation.row);
            }}
          />
          <CampaignCompareTable
            campaigns={compare.campaigns}
            metrics={compare.metrics}
            bestValues={compare.bestValues}
            bestDates={compare.bestDates}
            onOpenCampaign={openCampaign}
          />
        </>
      )}
    </div>
  );
}
