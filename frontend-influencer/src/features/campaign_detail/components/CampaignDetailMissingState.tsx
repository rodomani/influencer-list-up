import { Button } from "@/components/ui/button";

type CampaignDetailMissingStateProps = {
  onBack: () => void;
};

export function CampaignDetailMissingState({ onBack }: CampaignDetailMissingStateProps) {
  return (
    <div className="deco-page deco-panel flex flex-col gap-4">
      <p className="text-sm text-red-200">キャンペーン情報がないよ。戻って選んでね。</p>
      <Button variant="outline" onClick={onBack}>
        一覧に戻る
      </Button>
    </div>
  );
}
