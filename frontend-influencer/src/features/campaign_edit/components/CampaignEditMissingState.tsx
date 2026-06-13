import { Button } from "@/components/ui/button";

type CampaignEditMissingStateProps = {
  onBack: () => void;
};

export function CampaignEditMissingState({ onBack }: CampaignEditMissingStateProps) {
  return (
    <div className="deco-page deco-panel flex flex-col gap-4">
      <p className="text-sm text-red-200">編集するキャンペーンがないよ。</p>
      <Button variant="outline" onClick={onBack}>
        一覧に戻る
      </Button>
    </div>
  );
}
