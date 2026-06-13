import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchPage } from "@/features/search_page/api/useSearchPage";
import { SearchFilterPanel } from "@/features/search_page/components/SearchFilterPanel";
import { SearchPageHero } from "@/features/search_page/components/SearchPageHero";

export function SearchScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchPage = useSearchPage(user?.id);

  const handleSearch = () => {
    const filters = searchPage.buildSearchFilters();
    if (!filters) return;
    navigate("/search/search_results", { state: { filters } });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-none flex-col gap-8">
        <SearchPageHero
          platformCount={searchPage.platforms.length}
          keywordCount={searchPage.keywords.length}
          campaignCount={searchPage.campaigns.length}
        />

        <SearchFilterPanel
          platforms={searchPage.platforms}
          platformError={searchPage.platformError}
          username={searchPage.username}
          keywords={searchPage.keywords}
          isKeywordMenuOpen={searchPage.isKeywordMenuOpen}
          keywordOptions={searchPage.keywordOptions}
          keywordLoading={searchPage.keywordLoading}
          keywordError={searchPage.keywordError}
          campaigns={searchPage.campaigns}
          campaignLoading={searchPage.campaignLoading}
          campaignError={searchPage.campaignError}
          selectedCampaignId={searchPage.selectedCampaignId}
          rangeFilters={searchPage.rangeFilters}
          onTogglePlatform={searchPage.togglePlatform}
          onUsernameChange={searchPage.setUsername}
          onKeywordMenuOpenChange={searchPage.setIsKeywordMenuOpen}
          onToggleKeyword={searchPage.toggleKeyword}
          onCampaignChange={searchPage.setSelectedCampaignId}
          onRangeInputChange={searchPage.handleRangeInputChange}
          onSearch={handleSearch}
        />
      </div>
    </div>
  );
}
