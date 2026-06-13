import { type FormEvent, useState } from "react";

type BookmarkTagsPanelProps = {
  tags: Array<{ id: number; name: string }>;
  selectedTagId: number | "all";
  creating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSelectTag: (tagId: number | "all") => void;
  onCreateTag: (name: string) => Promise<boolean>;
};

export function BookmarkTagsPanel({
  tags,
  selectedTagId,
  creating,
  error,
  persistenceReady,
  onSelectTag,
  onCreateTag,
}: BookmarkTagsPanelProps) {
  const [tagName, setTagName] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await onCreateTag(tagName);
    if (created) setTagName("");
  };

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">タレントプールタグ</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            研究ラベル
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            フォルダーより柔軟に、ジャンル・強み・注意点・優先度をタグで整理できます。
          </p>
        </div>
      </div>

      <div className="mt-5 grid w-full min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`border px-4 py-2 text-sm font-black transition ${
                selectedTagId === "all"
                  ? "border-[#D4AF37]/40 bg-[#fffdf7] text-slate-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
              }`}
              onClick={() => onSelectTag("all")}
            >
              すべて
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`min-w-0 break-words border px-4 py-2 text-sm font-black transition ${
                  selectedTagId === tag.id
                    ? "border-[#D4AF37]/40 bg-[#fffdf7] text-slate-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
                }`}
                onClick={() => onSelectTag(tag.id)}
              >
                #{tag.name}
              </button>
            ))}
          </div>
          {!persistenceReady && (
            <p className="mt-3 border border-[#D4AF37]/40 bg-[#fffdf7] px-3 py-2 text-sm text-slate-700">
              タグを保存するには、bookmark_tags のマイグレーションをSupabaseへ反映してください。
            </p>
          )}
          {error && (
            <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              エラー: {error}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="min-w-0 border border-slate-200 bg-[#f9fafb] p-4">
          <label className="deco-label" htmlFor="bookmark-tag-name">
            新規タグ
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row xl:flex-col">
            <input
              id="bookmark-tag-name"
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              className="h-11 min-w-0 flex-1 border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              placeholder="例: 高エンゲージメント"
            />
            <button
              type="submit"
              disabled={creating || !tagName.trim()}
              className="h-11 bg-[#D4AF37] px-4 text-sm font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-[#c49f2f] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {creating ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
