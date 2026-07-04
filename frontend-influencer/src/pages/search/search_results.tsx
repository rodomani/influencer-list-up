import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchResults } from "@/features/search_results/api/useSearchResults";
import { CompareTray } from "@/features/search_results/components/CompareTray";
import { SearchResultCard } from "@/features/search_results/components/SearchResultCard";
import { SearchResultsHeader } from "@/features/search_results/components/SearchResultsHeader";
import { SearchResultsPagination } from "@/features/search_results/components/SearchResultsPagination";
import { SearchResultsSortPanel } from "@/features/search_results/components/SearchResultsSortPanel";
import { SearchResultsStatus } from "@/features/search_results/components/SearchResultsStatus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Filters } from "@/features/search_results/types";
import { parseSearchFilters } from "@/features/search_results/logic/searchQueryParams";

export function SearchResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const filters: Filters | undefined = location.state?.filters ?? parseSearchFilters(location.search);
  const results = useSearchResults(filters, user?.id);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-full flex-col gap-7">
        <SearchResultsHeader
          resultCount={results.totalCount}
          selectedCount={results.selectedForCompare.length}
          compareLimit={results.compareLimit}
          onBackToSearch={() => navigate("/search/search")}
        />

        <SearchResultsStatus
          loading={results.loading}
          error={results.error}
          resultCount={results.totalCount}
          compareError={results.compareError}
        />

        {!results.loading && !results.error && results.totalCount > 0 && (
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
              onNavigateToDetail={(id) => navigate(`/search/influencer/${id}`)}
              onToggleCompare={results.handleToggleCompare}
              onToggleBookmark={results.handleToggleBookmark}
              onSelectCampaignTarget={results.setSelectedInfluencer}
              onOpenCampaignDialog={results.setDialogOpen}
            />
          ))}
        </div>

        {!results.loading && !results.error && (
          <SearchResultsPagination
            resultCount={results.totalCount}
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

        <Dialog open={results.dialogOpen} onOpenChange={results.setDialogOpen}>
          <DialogContent className="border border-slate-200 bg-white text-slate-950">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-[0.12em] text-slate-950">
                キャンペーンを選択
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {results.selectedInfluencerName || "このインフルエンサー"}を追加するキャンペーンを選んでください。
              </DialogDescription>
            </DialogHeader>

            {results.campaignsLoading && (
              <p className="text-sm text-slate-500">キャンペーンを読み込み中...</p>
            )}
            {results.campaignsError && (
              <p className="text-sm text-red-600">エラー: {results.campaignsError}</p>
            )}
            {!results.campaignsLoading && results.campaigns.length === 0 && (
              <p className="text-sm text-slate-500">キャンペーンが見つかりません。</p>
            )}

            <div className="flex flex-col gap-2">
              {results.campaigns.map((campaign) => (
                <Button
                  key={campaign.id}
                  variant="outline"
                  className="justify-start border-slate-300 bg-white text-slate-900 hover:border-[#D4AF37]"
                  disabled={results.savingCampaignId === String(campaign.id)}
                  onClick={() => results.handleAddToCampaign(String(campaign.id))}
                >
                  {results.savingCampaignId === String(campaign.id) ? "保存中..." : campaign.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
