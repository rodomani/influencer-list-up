import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CampaignOption } from "../types";
import { PLATFORM_OPTIONS } from "../logic/searchPageConstants";

type SearchBasicFiltersProps = {
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
  onTogglePlatform: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onKeywordMenuOpenChange: (open: boolean) => void;
  onToggleKeyword: (value: string) => void;
  onCampaignChange: (value: string) => void;
};

export function SearchBasicFilters({
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
  onTogglePlatform,
  onUsernameChange,
  onKeywordMenuOpenChange,
  onToggleKeyword,
  onCampaignChange,
}: SearchBasicFiltersProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1.4fr_1fr]">
      <div className="space-y-2">
        <label htmlFor="platform" className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">
          プラットフォーム
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`h-12 w-full justify-between border-slate-300 bg-white text-slate-900 hover:border-[#D4AF37] hover:bg-white ${
                platformError ? "border-red-500 text-red-600" : ""
              }`}
            >
              {platforms.length > 0 ? platforms.join(", ") : "プラットフォームを選ぶ"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 border-slate-200 bg-white text-slate-900" align="start">
            {PLATFORM_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option}
                checked={platforms.includes(option)}
                onCheckedChange={() => onTogglePlatform(option)}
                onSelect={(event) => event.preventDefault()}
              >
                {option}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {platformError && <p className="text-xs text-red-600">{platformError}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="username" className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">
          ユーザー名
        </label>
        <Input
          id="username"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          className="h-12 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:border-[#D4AF37]"
          placeholder="アカウント名"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="keyword" className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">
          キーワード
        </label>
        <DropdownMenu open={isKeywordMenuOpen} onOpenChange={onKeywordMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-12 w-full justify-between border-slate-300 bg-white text-slate-900 hover:border-[#D4AF37] hover:bg-white"
            >
              {keywords.length > 0 ? keywords.join(", ") : "キーワードを選ぶ"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 border-slate-200 bg-white text-slate-900" align="start">
            {keywordLoading && (
              <div className="px-2 py-1.5 text-xs text-slate-500">読み込み中...</div>
            )}
            {!keywordLoading && keywordOptions.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-slate-500">
                {keywordError ? "キーワードの取得に失敗したよ。" : "キーワードがないよ。"}
              </div>
            )}
            {keywordOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option}
                checked={keywords.includes(option)}
                onCheckedChange={() => onToggleKeyword(option)}
                onSelect={(event) => event.preventDefault()}
              >
                {option}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-800"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="campaign" className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">
          キャンペーン
        </label>
        <Select
          value={selectedCampaignId}
          onValueChange={onCampaignChange}
          disabled={campaignLoading || campaigns.length === 0}
        >
          <SelectTrigger className="h-12 border-slate-300 bg-white text-slate-950">
            <SelectValue placeholder={campaignLoading ? "読み込み中..." : "キャンペーンを選ぶ"} />
          </SelectTrigger>
          <SelectContent className="border-slate-200 bg-white text-slate-900">
            {campaignError && (
              <SelectItem value="error" disabled>
                {campaignError}
              </SelectItem>
            )}
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={String(campaign.id)}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
