import { useAuth } from "@/contexts/AuthContext";
import { useCreateCampaign } from "@/features/create_campaign/api/useCreateCampaign";
import { CreateCampaignHero } from "@/features/create_campaign/components/CreateCampaignHero";
import { CreateCampaignPanel } from "@/features/create_campaign/components/CreateCampaignPanel";

export function CreateCampaignScreen() {
  const { user } = useAuth();
  const createCampaign = useCreateCampaign(user?.id);

  return (
    <div className="-mx-4 -my-5 flex min-h-screen w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-7 overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-8 lg:w-[calc(100%+4rem)] lg:px-8">
      <CreateCampaignHero onBack={createCampaign.goToCampaignList} />
      <CreateCampaignPanel
        formValues={createCampaign.formValues}
        dateRange={createCampaign.dateRange}
        error={createCampaign.error}
        submitting={createCampaign.submitting}
        onInputChange={createCampaign.handleInputChange}
        onGoalTemplateSelect={createCampaign.handleGoalTemplateSelect}
        onDateRangeChange={createCampaign.setDateRange}
        onAddInfluencer={createCampaign.goToInfluencerSearch}
        onCreate={createCampaign.handleCreate}
      />
    </div>
  );
}
