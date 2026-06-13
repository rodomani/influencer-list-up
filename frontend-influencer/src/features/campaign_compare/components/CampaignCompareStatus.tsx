type CampaignCompareStatusProps = {
  loading: boolean;
  error: string | null;
};

export function CampaignCompareStatus({ loading, error }: CampaignCompareStatusProps) {
  if (loading) {
    return (
      <div className="deco-panel text-sm text-muted-foreground">
        キャンペーン比較データを読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        エラー: {error}
      </div>
    );
  }

  return null;
}
