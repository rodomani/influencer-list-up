import type { Dispatch, SetStateAction } from "react";
import type { CampaignOption, RangeFilterConfig } from "../types";
import { SearchBasicFilters } from "./SearchBasicFilters";
import { SearchRangeFilters } from "./SearchRangeFilters";
import { SearchSubmitRow } from "./SearchSubmitRow";

type SearchFilterPanelProps = {
  platforms: string[];
  platformError: string | null;
  username: string;
  keywords: string[];
  isKeywordMenuOpen: boolean;
  keywordOptions: string[];
  keywordLoading: boolean;
  keywordError: string | null;
  campaigns: CampaignOption[];
  campaignLoading: boolean;
  campaignError: string | null;
  selectedCampaignId: string | undefined;
  rangeFilters: RangeFilterConfig[];
  onTogglePlatform: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onKeywordMenuOpenChange: (open: boolean) => void;
  onToggleKeyword: (value: string) => void;
  onCampaignChange: (value: string) => void;
  onRangeInputChange: (
    nextRaw: number,
    index: 0 | 1,
    current: number[],
    setter: Dispatch<SetStateAction<number[]>>
  ) => void;
  onSearch: () => void;
};

export function SearchFilterPanel({
  platforms,
  platformError,
  username,
  keywords,
  isKeywordMenuOpen,
  keywordOptions,
  keywordLoading,
  keywordError,
  campaigns,
  campaignLoading,
  campaignError,
  selectedCampaignId,
  rangeFilters,
  onTogglePlatform,
  onUsernameChange,
  onKeywordMenuOpenChange,
  onToggleKeyword,
  onCampaignChange,
  onRangeInputChange,
  onSearch,
}: SearchFilterPanelProps) {
  return (
    <section className="w-full max-w-full overflow-hidden border border-slate-200 bg-white shadow-[0_24px_80px_-56px_rgba(15,23,42,0.28)]">
      <div className="border-b border-slate-200 px-6 py-5 sm:px-8 lg:px-10">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">検索条件</p>
      </div>

      <div className="grid gap-8 px-6 py-7 sm:px-8 lg:px-10">
        <SearchBasicFilters
          platforms={platforms}
          platformError={platformError}
          username={username}
          keywords={keywords}
          isKeywordMenuOpen={isKeywordMenuOpen}
          keywordOptions={keywordOptions}
          keywordLoading={keywordLoading}
          keywordError={keywordError}
          campaigns={campaigns}
          campaignLoading={campaignLoading}
          campaignError={campaignError}
          selectedCampaignId={selectedCampaignId}
          onTogglePlatform={onTogglePlatform}
          onUsernameChange={onUsernameChange}
          onKeywordMenuOpenChange={onKeywordMenuOpenChange}
          onToggleKeyword={onToggleKeyword}
          onCampaignChange={onCampaignChange}
        />

        <SearchRangeFilters
          rangeFilters={rangeFilters}
          onRangeInputChange={onRangeInputChange}
        />

        <SearchSubmitRow onSearch={onSearch} />
      </div>
    </section>
  );
}
