import { type FormEvent, useState } from "react";

type BookmarkFoldersPanelProps = {
  folders: Array<{ id: number; name: string }>;
  selectedFolderId: number | "all";
  totalCount: number;
  visibleCount: number;
  creating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSelectFolder: (folderId: number | "all") => void;
  onCreateFolder: (name: string) => Promise<boolean>;
};

export function BookmarkFoldersPanel({
  folders,
  selectedFolderId,
  totalCount,
  visibleCount,
  creating,
  error,
  persistenceReady,
  onSelectFolder,
  onCreateFolder,
}: BookmarkFoldersPanelProps) {
  const [folderName, setFolderName] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await onCreateFolder(folderName);
    if (created) setFolderName("");
  };

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">フォルダー</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            保存リストを整理
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            案件別、ジャンル別、優先度別にブックマークを分けて確認できます。
          </p>
        </div>
        <div className="border border-slate-200 bg-[#f9fafb] px-4 py-3 text-right">
          <p className="deco-label">表示中</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {visibleCount} / {totalCount}
          </p>
        </div>
      </div>

      <div className="mt-5 grid w-full min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`border px-4 py-2 text-sm font-black transition ${
                selectedFolderId === "all"
                  ? "border-[#046307]/30 bg-[#ecfdf5] text-slate-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
              }`}
              onClick={() => onSelectFolder("all")}
            >
              すべて
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={`min-w-0 break-words border px-4 py-2 text-sm font-black transition ${
                  selectedFolderId === folder.id
                    ? "border-[#046307]/30 bg-[#ecfdf5] text-slate-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#D4AF37]"
                }`}
                onClick={() => onSelectFolder(folder.id)}
              >
                {folder.name}
              </button>
            ))}
          </div>
          {!persistenceReady && (
            <p className="mt-3 border border-[#D4AF37]/40 bg-[#fffdf7] px-3 py-2 text-sm text-slate-700">
              フォルダーを保存するには、bookmark_folders のマイグレーションをSupabaseへ反映してください。
            </p>
          )}
          {error && (
            <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              エラー: {error}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="min-w-0 border border-slate-200 bg-[#f9fafb] p-4">
          <label className="deco-label" htmlFor="bookmark-folder-name">
            新規フォルダー
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row xl:flex-col">
            <input
              id="bookmark-folder-name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              className="h-11 min-w-0 flex-1 border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              placeholder="例: 美容案件"
            />
            <button
              type="submit"
              disabled={creating || !folderName.trim()}
              className="h-11 bg-[#046307] px-4 text-sm font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#035306] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {creating ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
