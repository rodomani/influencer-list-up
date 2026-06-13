type BookmarkRatingStatusProps = {
  error: string | null;
  persistenceReady: boolean;
};

export function BookmarkRatingStatus({
  error,
  persistenceReady,
}: BookmarkRatingStatusProps) {
  if (!error && persistenceReady) return null;

  return (
    <section className="deco-panel text-sm">
      {!persistenceReady && (
        <p className="text-slate-700">
          候補評価を使うには、user_bookmarks の personal_rating カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-red-700">エラー: {error}</p>}
    </section>
  );
}
