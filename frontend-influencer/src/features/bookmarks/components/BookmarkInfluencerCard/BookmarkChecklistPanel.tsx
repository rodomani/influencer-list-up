import type { BookmarkedInfluencer, BookmarkResearchChecklist } from "../../types";
import { BookmarkResearchChecklist as BookmarkResearchChecklistPanel } from "../BookmarkResearchChecklist";

type BookmarkChecklistPanelProps = {
  influencer: BookmarkedInfluencer;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSave: (payload: {
    influencer: BookmarkedInfluencer;
    checklist: BookmarkResearchChecklist;
  }) => Promise<boolean>;
};

export function BookmarkChecklistPanel({
  influencer,
  updating,
  error,
  persistenceReady,
  onSave,
}: BookmarkChecklistPanelProps) {
  return (
    <BookmarkResearchChecklistPanel
      value={influencer.researchChecklist}
      updating={updating}
      error={error}
      persistenceReady={persistenceReady}
      onSave={(checklist) =>
        onSave({
          influencer,
          checklist,
        })
      }
    />
  );
}
