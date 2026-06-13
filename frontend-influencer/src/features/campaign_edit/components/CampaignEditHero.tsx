import { Button } from "@/components/ui/button";

type CampaignEditHeroProps = {
  onBack: () => void;
};

export function CampaignEditHero({ onBack }: CampaignEditHeroProps) {
  return (
    <div className="deco-hero flex w-full max-w-none min-w-0 flex-wrap items-center justify-between gap-6">
      <div>
        <div className="deco-kicker">キャンペーン編集</div>
        <div className="section-title font-display mt-3">キャンペーン編集</div>
        <div className="section-subtitle">内容を整えておこう。</div>
      </div>
      <Button variant="outline" onClick={onBack}>
        戻る
      </Button>
    </div>
  );
}
