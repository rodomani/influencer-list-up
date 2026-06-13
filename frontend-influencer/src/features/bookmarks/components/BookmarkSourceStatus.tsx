type BookmarkSourceStatusProps = {
  error: string | null;
  persistenceReady: boolean;
};

export function BookmarkSourceStatus({
  error,
  persistenceReady,
}: BookmarkSourceStatusProps) {
  if (!error && persistenceReady) return null;

  return (
    <section className="deco-panel text-sm">
      {!persistenceReady && (
        <p className="text-slate-700">
          保存元を記録するには、user_bookmarks の saved_source / saved_source_detail カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-red-700">エラー: {error}</p>}
    </section>
  );
}
