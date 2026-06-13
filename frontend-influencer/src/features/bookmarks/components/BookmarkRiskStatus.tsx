type BookmarkRiskStatusProps = {
  error: string | null;
  persistenceReady: boolean;
};

export function BookmarkRiskStatus({
  error,
  persistenceReady,
}: BookmarkRiskStatusProps) {
  if (!error && persistenceReady) return null;

  return (
    <section className="deco-panel text-sm">
      {!persistenceReady && (
        <p className="text-slate-700">
          リスク情報を使うには、user_bookmarks の risk_level / risk_notes カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-red-700">エラー: {error}</p>}
    </section>
  );
}
