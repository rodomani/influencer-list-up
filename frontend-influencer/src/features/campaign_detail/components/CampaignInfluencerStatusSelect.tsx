import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CAMPAIGN_INFLUENCER_STATUS_OPTIONS,
  campaignInfluencerStatusLabel,
} from "../logic/campaignInfluencerFormatters";

type CampaignInfluencerStatusSelectProps = {
  value: string | null | undefined;
  disabled?: boolean;
  onChange: (status: string) => void;
};

export function CampaignInfluencerStatusSelect({
  value,
  disabled = false,
  onChange,
}: CampaignInfluencerStatusSelectProps) {
  return (
    <Select value={value ?? "selected"} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 border-border/70 bg-background text-xs font-black uppercase tracking-[0.12em]">
        <SelectValue placeholder={campaignInfluencerStatusLabel(value)} />
      </SelectTrigger>
      <SelectContent>
        {CAMPAIGN_INFLUENCER_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
