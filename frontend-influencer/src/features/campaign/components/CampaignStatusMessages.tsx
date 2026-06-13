type CampaignStatusMessagesProps = {
  loading: boolean;
  error: string | null;
  campaignCount: number;
};

export function CampaignStatusMessages({
  loading,
  error,
  campaignCount,
}: CampaignStatusMessagesProps) {
  return (
    <>
      {loading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラー: {error}</p>}
      {!loading && campaignCount === 0 && (
        <p className="text-sm text-muted-foreground">キャンペーンがまだないよ。</p>
      )}
    </>
  );
}
