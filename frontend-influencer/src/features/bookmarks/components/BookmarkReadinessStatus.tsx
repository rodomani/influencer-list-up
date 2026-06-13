type BookmarkReadinessStatusProps = {
  error: string | null;
  persistenceReady: boolean;
};

export function BookmarkReadinessStatus({
  error,
  persistenceReady,
}: BookmarkReadinessStatusProps) {
  if (!error && persistenceReady) return null;

  return (
    <section className="deco-panel text-sm">
      {!persistenceReady && (
        <p className="text-slate-700">
          候補状況を使うには、user_bookmarks の candidate_readiness カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-red-700">エラー: {error}</p>}
    </section>
  );
}
