type BookmarkMemoStatusProps = {
  error: string | null;
  persistenceReady: boolean;
};

export function BookmarkMemoStatus({
  error,
  persistenceReady,
}: BookmarkMemoStatusProps) {
  if (!error && persistenceReady) return null;

  return (
    <section className="deco-panel text-sm">
      {!persistenceReady && (
        <p className="text-slate-700">
          保存理由メモを使うには、user_bookmarks の saved_reason カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-red-700">エラー: {error}</p>}
    </section>
  );
}
