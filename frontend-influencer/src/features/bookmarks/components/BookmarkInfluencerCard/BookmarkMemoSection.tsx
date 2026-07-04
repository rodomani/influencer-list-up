import { useEffect, useState } from "react";
import type { BookmarkedInfluencer } from "../../types";
import { BookmarkMemoPanel } from "./BookmarkMemoPanel";

type BookmarkMemoSectionProps = {
  influencer: BookmarkedInfluencer;
  updatingMemo: boolean;
  onSave: (payload: {
    influencer: BookmarkedInfluencer;
    memo: string;
  }) => Promise<boolean>;
};

export function BookmarkMemoSection({
  influencer,
  updatingMemo,
  onSave,
}: BookmarkMemoSectionProps) {
  const [memoDraft, setMemoDraft] = useState(influencer.whySavedMemo);

  useEffect(() => {
    setMemoDraft(influencer.whySavedMemo);
  }, [influencer.id, influencer.whySavedMemo]);

  return (
    <BookmarkMemoPanel
      memoDraft={memoDraft}
      savedMemo={influencer.whySavedMemo}
      updatingMemo={updatingMemo}
      onDraftChange={setMemoDraft}
      onSave={async () => {
        await onSave({
          influencer,
          memo: memoDraft,
        });
      }}
    />
  );
}
