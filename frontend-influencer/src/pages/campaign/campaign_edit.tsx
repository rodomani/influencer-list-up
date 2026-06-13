import { useAuth } from "@/contexts/AuthContext";
import { useCampaignEdit } from "@/features/campaign_edit/api/useCampaignEdit";
import { CampaignEditHero } from "@/features/campaign_edit/components/CampaignEditHero";
import { CampaignEditMissingState } from "@/features/campaign_edit/components/CampaignEditMissingState";
import { CampaignEditPanel } from "@/features/campaign_edit/components/CampaignEditPanel";

export function CampaignEditScreen() {
  const { user } = useAuth();
  const campaignEdit = useCampaignEdit(user?.id);

  if (!campaignEdit.campaign) {
    return <CampaignEditMissingState onBack={campaignEdit.goToCampaignList} />;
  }

  return (
    <div className="-mx-4 -my-5 flex min-h-screen w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-7 overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-8 lg:w-[calc(100%+4rem)] lg:px-8">
      <CampaignEditHero onBack={campaignEdit.goBack} />
      <CampaignEditPanel
        formValues={campaignEdit.formValues}
        dateRange={campaignEdit.dateRange}
        error={campaignEdit.error}
        submitting={campaignEdit.submitting}
        onInputChange={campaignEdit.handleInputChange}
        onGoalTemplateSelect={campaignEdit.handleGoalTemplateSelect}
        onDateRangeChange={campaignEdit.setDateRange}
        onAddInfluencer={campaignEdit.goToInfluencerSearch}
        onUpdate={campaignEdit.handleUpdate}
      />
    </div>
  );
}
