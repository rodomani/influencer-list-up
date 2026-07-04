import type { BookmarkedInfluencer } from "../../types";

type BookmarkFolderTagControlsProps = {
  influencer: BookmarkedInfluencer;
  folders: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  updatingFolderAssignment: string | null;
  updatingTagAssignment: string | null;
  onToggleFolder: (payload: { influencer: BookmarkedInfluencer; folderId: number }) => void;
  onToggleTag: (payload: { influencer: BookmarkedInfluencer; tagId: number }) => void;
};

export function BookmarkFolderTagControls({
  influencer,
  folders,
  tags,
  updatingFolderAssignment,
  updatingTagAssignment,
  onToggleFolder,
  onToggleTag,
}: BookmarkFolderTagControlsProps) {
  return (
    <>
      {folders.length > 0 && (
        <div
          className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="deco-label mr-1">所属フォルダー</span>
            {folders.map((folder) => {
              const assigned = influencer.folderIds.includes(folder.id);
              const assignmentKey = `${influencer.id}-${folder.id}`;

              return (
                <button
                  key={folder.id}
                  type="button"
                  disabled={updatingFolderAssignment === assignmentKey}
                  className={`max-w-full break-words border px-3 py-1.5 text-xs font-black transition ${
                    assigned
                      ? "border-[#046307]/30 bg-[#ecfdf5] text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#D4AF37]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-pressed={assigned}
                  onClick={() => onToggleFolder({ influencer, folderId: folder.id })}
                >
                  {folder.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div
          className="border-t border-slate-200 bg-white px-5 py-4 sm:px-7"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="deco-label mr-1">タレントタグ</span>
            {tags.map((tag) => {
              const assigned = influencer.tagIds.includes(tag.id);
              const assignmentKey = `${influencer.id}-${tag.id}`;

              return (
                <button
                  key={tag.id}
                  type="button"
                  disabled={updatingTagAssignment === assignmentKey}
                  className={`max-w-full break-words border px-3 py-1.5 text-xs font-black transition ${
                    assigned
                      ? "border-[#D4AF37]/45 bg-[#fffdf7] text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#D4AF37]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-pressed={assigned}
                  onClick={() => onToggleTag({ influencer, tagId: tag.id })}
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
