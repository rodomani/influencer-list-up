import { useAuth } from "@/contexts/AuthContext";
import { useCampaignDetail } from "@/features/campaign_detail/api/useCampaignDetail";
import { CampaignInfluencerManagement } from "@/features/campaign_detail/components/CampaignInfluencerManagement";
import { CampaignBudgetAllocationPanel } from "@/features/campaign_detail/components/CampaignBudgetAllocationPanel";
import { CampaignCalendarViewPanel } from "@/features/campaign_detail/components/CampaignCalendarViewPanel";
import { CampaignDetailActions } from "@/features/campaign_detail/components/CampaignDetailActions";
import { CampaignDetailHero } from "@/features/campaign_detail/components/CampaignDetailHero";
import { CampaignDetailMissingState } from "@/features/campaign_detail/components/CampaignDetailMissingState";
import { CampaignDetailPanel } from "@/features/campaign_detail/components/CampaignDetailPanel";
import { CampaignInternalMemoPanel } from "@/features/campaign_detail/components/CampaignInternalMemoPanel";
import { CampaignPerformancePanel } from "@/features/campaign_detail/components/CampaignPerformancePanel";
import { CampaignRecommendedInfluencersPanel } from "@/features/campaign_detail/components/CampaignRecommendedInfluencersPanel";
import { CampaignReportPanel } from "@/features/campaign_detail/components/CampaignReportPanel";
import { CampaignRoiEfficiencyPanel } from "@/features/campaign_detail/components/CampaignRoiEfficiencyPanel";
import { CampaignTaskChecklistPanel } from "@/features/campaign_detail/components/CampaignTaskChecklistPanel";
import { CampaignTimelinePanel } from "@/features/campaign_detail/components/CampaignTimelinePanel";

export function CampaignDetailScreen() {
  const { user } = useAuth();
  const {
    campaign,
    campaignBudgetAllocation,
    campaignInfluencers,
    campaignInfluencerSummary,
    campaignPerformanceSummary,
    campaignRoiEfficiency,
    campaignCalendarEvents,
    campaignCalendarMonths,
    campaignTimeline,
    recommendedInfluencers,
    campaignTasks,
    campaignCustomCalendarEvents,
    influencersLoading,
    influencersError,
    recommendationsLoading,
    recommendationsError,
    addingRecommendedAccountId,
    updatingInfluencerId,
    statusUpdating,
    statusError,
    memoSaving,
    memoError,
    tasksLoading,
    tasksError,
    updatingTaskId,
    taskPersistenceReady,
    customCalendarEventsLoading,
    customCalendarEventsError,
    customCalendarEventsPersistenceReady,
    creatingCalendarEvent,
    deletingCalendarEventId,
    goToCampaignList,
    goToEditCampaign,
    handleStatusChange,
    handleInfluencerStatusChange,
    handleInfluencerQuotedPriceChange,
    handleInfluencerDeliverablesChange,
    handleRemoveInfluencer,
    handleInternalMemoSave,
    handleAddRecommendedInfluencer,
    handleTaskToggle,
    handleCreateCustomCalendarEvent,
    handleDeleteCustomCalendarEvent,
  } = useCampaignDetail(user?.id);

  if (!campaign) {
    return <CampaignDetailMissingState onBack={goToCampaignList} />;
  }

  return (
    <div className="-mx-4 -my-5 flex min-h-screen w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-7 overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-8 lg:w-[calc(100%+4rem)] lg:px-8">
      <CampaignDetailHero campaign={campaign} onBack={goToCampaignList} />
      <CampaignDetailPanel
        campaign={campaign}
        statusUpdating={statusUpdating}
        statusError={statusError}
        onStatusChange={handleStatusChange}
      />
      <CampaignPerformancePanel
        performance={campaignPerformanceSummary}
        loading={influencersLoading}
      />
      <CampaignBudgetAllocationPanel
        allocation={campaignBudgetAllocation}
        loading={influencersLoading}
      />
      <CampaignRoiEfficiencyPanel
        roi={campaignRoiEfficiency}
        loading={influencersLoading}
      />
      <CampaignReportPanel
        campaign={campaign}
        performance={campaignPerformanceSummary}
        allocation={campaignBudgetAllocation}
        roi={campaignRoiEfficiency}
        influencers={campaignInfluencers}
        tasks={campaignTasks}
        events={campaignCalendarEvents}
      />
      <CampaignTaskChecklistPanel
        tasks={campaignTasks}
        loading={tasksLoading}
        error={tasksError}
        updatingTaskId={updatingTaskId}
        persistenceReady={taskPersistenceReady}
        onToggle={handleTaskToggle}
      />
      <CampaignCalendarViewPanel
        months={campaignCalendarMonths}
        events={campaignCalendarEvents}
        customEvents={campaignCustomCalendarEvents}
        loading={influencersLoading || tasksLoading || customCalendarEventsLoading}
        customEventsLoading={customCalendarEventsLoading}
        customEventsError={customCalendarEventsError}
        persistenceReady={customCalendarEventsPersistenceReady}
        creatingCalendarEvent={creatingCalendarEvent}
        deletingCalendarEventId={deletingCalendarEventId}
        onCreateCustomEvent={handleCreateCustomCalendarEvent}
        onDeleteCustomEvent={handleDeleteCustomCalendarEvent}
      />
      <CampaignRecommendedInfluencersPanel
        recommendations={recommendedInfluencers}
        loading={recommendationsLoading}
        error={recommendationsError}
        addingAccountId={addingRecommendedAccountId}
        onAdd={handleAddRecommendedInfluencer}
      />
      <CampaignInternalMemoPanel
        campaign={campaign}
        saving={memoSaving}
        error={memoError}
        onSave={handleInternalMemoSave}
      />
      <CampaignTimelinePanel
        timeline={campaignTimeline}
        loading={influencersLoading}
      />
      <CampaignInfluencerManagement
        influencers={campaignInfluencers}
        summary={campaignInfluencerSummary}
        legacyInfluencers={campaign.influencers}
        loading={influencersLoading}
        error={influencersError}
        updatingInfluencerId={updatingInfluencerId}
        onStatusChange={handleInfluencerStatusChange}
        onQuotedPriceChange={handleInfluencerQuotedPriceChange}
        onDeliverablesChange={handleInfluencerDeliverablesChange}
        onRemove={handleRemoveInfluencer}
      />
      <CampaignDetailActions onEdit={goToEditCampaign} />
    </div>
  );
}
