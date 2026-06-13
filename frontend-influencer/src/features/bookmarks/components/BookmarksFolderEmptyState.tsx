type BookmarksFolderEmptyStateProps = {
  visible: boolean;
};

export function BookmarksFolderEmptyState({ visible }: BookmarksFolderEmptyStateProps) {
  if (!visible) return null;

  return (
    <section className="deco-panel text-sm text-muted-foreground">
      選択中の条件に合うインフルエンサーはまだありません。カード下部のフォルダー・タグボタンから追加できます。
    </section>
  );
}
