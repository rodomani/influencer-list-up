type BookmarksStatusProps = {
  hasUser: boolean;
  loading: boolean;
  error: string | null;
  count: number;
};

export function BookmarksStatus({
  hasUser,
  loading,
  error,
  count,
}: BookmarksStatusProps) {
  if (!hasUser) {
    return (
      <section className="deco-panel text-sm text-muted-foreground">
        ブックマークを見るにはログインしてください。
      </section>
    );
  }

  if (loading) {
    return (
      <section className="deco-panel text-sm text-muted-foreground">
        ブックマークを読み込み中...
      </section>
    );
  }

  if (error) {
    return (
      <section className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        エラー: {error}
      </section>
    );
  }

  if (count === 0) {
    return (
      <section className="deco-panel text-sm text-muted-foreground">
        ブックマークしたインフルエンサーはまだありません。
      </section>
    );
  }

  return null;
}
