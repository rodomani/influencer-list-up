import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchResults } from "@/features/search_results/api/useSearchResults";
import { CompareTray } from "@/features/search_results/components/CompareTray";
import { SearchResultCard } from "@/features/search_results/components/SearchResultCard";
import { SearchResultsHeader } from "@/features/search_results/components/SearchResultsHeader";
import { SearchResultsPagination } from "@/features/search_results/components/SearchResultsPagination";
import { SearchResultsSortPanel } from "@/features/search_results/components/SearchResultsSortPanel";
import { SearchResultsStatus } from "@/features/search_results/components/SearchResultsStatus";
import type { Filters } from "@/features/search_results/types";

export function SearchResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const filters: Filters | undefined = location.state?.filters;
  const results = useSearchResults(filters, user?.id);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-full flex-col gap-7">
        <SearchResultsHeader
          resultCount={results.influencers.length}
          selectedCount={results.selectedForCompare.length}
          compareLimit={results.compareLimit}
          onBackToSearch={() => navigate("/search/search")}
        />

        <SearchResultsStatus
          loading={results.loading}
          error={results.error}
          resultCount={results.influencers.length}
          compareError={results.compareError}
        />

        {!results.loading && !results.error && results.influencers.length > 0 && (
          <SearchResultsSortPanel
            sortOption={results.sortOption}
            onSortChange={results.handleSortChange}
          />
        )}

        <div className="grid w-full max-w-full gap-5">
          {results.paginatedInfluencers.map((influencer) => (
            <SearchResultCard
              key={influencer.id}
              influencer={influencer}
              userId={user?.id}
              isSelectedForCompare={results.selectedCompareIds.has(influencer.id)}
              dialogOpen={results.dialogOpen}
              campaigns={results.campaigns}
              campaignsLoading={results.campaignsLoading}
              campaignsError={results.campaignsError}
              savingCampaignId={results.savingCampaignId}
              selectedInfluencerName={results.selectedInfluencerName}
              onOpenDialogChange={results.setDialogOpen}
              onNavigateToDetail={(id) => navigate(`/search/influencer/${id}`)}
              onToggleCompare={results.handleToggleCompare}
              onToggleBookmark={results.handleToggleBookmark}
              onSelectCampaignTarget={results.setSelectedInfluencer}
              onAddToCampaign={results.handleAddToCampaign}
            />
          ))}
        </div>

        {!results.loading && !results.error && (
          <SearchResultsPagination
            resultCount={results.influencers.length}
            itemsPerPage={results.itemsPerPage}
            effectiveCurrentPage={results.effectiveCurrentPage}
            totalPages={results.totalPages}
            onPageChange={results.setCurrentPage}
          />
        )}

        <CompareTray
          selectedForCompare={results.selectedForCompare}
          compareMinimum={results.compareMinimum}
          onCompare={() => {
            const ids = results.selectedForCompare.map((influencer) => influencer.id).join(",");
            navigate(`/search/compare?ids=${ids}`);
          }}
          onClear={results.clearCompareSelection}
        />
      </div>
    </div>
  );
}
