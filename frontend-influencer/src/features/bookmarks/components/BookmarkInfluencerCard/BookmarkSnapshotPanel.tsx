import type { BookmarkedInfluencer } from "../../types";
import { BookmarkSavedSnapshot } from "../BookmarkSavedSnapshot";

type BookmarkSnapshotPanelProps = {
  influencer: BookmarkedInfluencer;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onCapture: (payload: { influencer: BookmarkedInfluencer }) => Promise<boolean>;
};

export function BookmarkSnapshotPanel({
  influencer,
  updating,
  error,
  persistenceReady,
  onCapture,
}: BookmarkSnapshotPanelProps) {
  return (
    <BookmarkSavedSnapshot
      snapshot={influencer.savedSnapshot}
      currentMetrics={influencer.accounts_metrics}
      updating={updating}
      error={error}
      persistenceReady={persistenceReady}
      onCapture={() =>
        onCapture({
          influencer,
        })
      }
    />
  );
}
