import { Button } from "@/components/ui/button";

type CreateCampaignHeroProps = {
  onBack: () => void;
};

export function CreateCampaignHero({ onBack }: CreateCampaignHeroProps) {
  return (
    <div className="deco-hero flex w-full max-w-none min-w-0 flex-wrap items-center justify-between gap-6">
      <div>
        <div className="deco-kicker">新規キャンペーン</div>
        <div className="section-title font-display mt-3">キャンペーン作成</div>
        <div className="section-subtitle">範囲・予算・日程を決めよう。</div>
      </div>
      <Button variant="outline" onClick={onBack}>
        一覧に戻る
      </Button>
    </div>
  );
}
