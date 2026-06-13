import { Button } from "@/components/ui/button";

type CampaignDetailActionsProps = {
  onEdit: () => void;
};

export function CampaignDetailActions({ onEdit }: CampaignDetailActionsProps) {
  return (
    <div className="pt-2">
      <Button onClick={onEdit}>編集する</Button>
    </div>
  );
}
