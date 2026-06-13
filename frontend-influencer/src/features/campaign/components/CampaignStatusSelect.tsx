import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_STATUS_OPTIONS, campaignStatusLabel } from "../logic/campaignStatus";

type CampaignStatusSelectProps = {
  value: string | null | undefined;
  disabled?: boolean;
  onChange: (status: string) => void;
};

export function CampaignStatusSelect({
  value,
  disabled = false,
  onChange,
}: CampaignStatusSelectProps) {
  return (
    <Select value={value ?? "draft"} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 border-border/70 bg-background text-xs font-black uppercase tracking-[0.12em]">
        <SelectValue placeholder={campaignStatusLabel(value)} />
      </SelectTrigger>
      <SelectContent>
        {CAMPAIGN_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
