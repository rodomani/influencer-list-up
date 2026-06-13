import { Button } from "@/components/ui/button";

type CampaignHeroProps = {
  onCreate: () => void;
};

export function CampaignHero({ onCreate }: CampaignHeroProps) {
  return (
    <div className="deco-hero flex w-full max-w-none min-w-0 flex-wrap items-center justify-between gap-6">
      <div>
        <div className="deco-kicker">キャンペーン台帳</div>
        <div className="section-title font-display mt-3">キャンペーン一覧</div>
        <div className="section-subtitle">
          計画・進行・振り返りをまとめて管理。予算、期間、目標を落ち着いた一覧で確認できます。
        </div>
      </div>
      <Button onClick={onCreate}>新しいキャンペーン</Button>
    </div>
  );
}
