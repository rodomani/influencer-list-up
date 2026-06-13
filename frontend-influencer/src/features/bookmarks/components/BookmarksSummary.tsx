import { formatBookmarkMetric } from "../logic/bookmarkFormatters";

type BookmarksSummaryProps = {
  loading: boolean;
  count: number;
  summary: {
    count: number;
    totalFollowers: number;
    totalPosts: number;
    averageMaxLikes: number;
  };
};

export function BookmarksSummary({
  loading,
  count,
  summary,
}: BookmarksSummaryProps) {
  if (loading || count === 0) return null;

  const items = [
    {
      label: "保存数",
      value: formatBookmarkMetric(summary.count),
      note: "現在のブックマーク数",
    },
    {
      label: "合計フォロワー",
      value: formatBookmarkMetric(summary.totalFollowers),
      note: "保存候補者の合計",
    },
    {
      label: "合計投稿数",
      value: formatBookmarkMetric(summary.totalPosts),
      note: "最新指標ベース",
    },
    {
      label: "平均最大いいね",
      value: formatBookmarkMetric(summary.averageMaxLikes),
      note: "候補者あたりの平均",
    },
  ];

  return (
    <section className="grid w-full min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="deco-panel min-w-0">
          <p className="deco-label">{item.label}</p>
          <p className="mt-3 break-words text-3xl font-black tracking-[0.08em] text-slate-950">
            {item.value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
        </article>
      ))}
    </section>
  );
}
