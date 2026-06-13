type SearchResultsStatusProps = {
  loading: boolean;
  error: string | null;
  resultCount: number;
  compareError: string | null;
};

export function SearchResultsStatus({
  loading,
  error,
  resultCount,
  compareError,
}: SearchResultsStatusProps) {
  return (
    <>
      {loading && (
        <div className="border border-slate-200 bg-white p-6 text-sm text-slate-500">
          インフルエンサーを検索中...
        </div>
      )}
      {error && (
        <div className="border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          エラー: {error}
        </div>
      )}
      {!loading && !error && resultCount === 0 && (
        <div className="border border-slate-200 bg-white p-6 text-sm text-slate-500">
          インフルエンサーが見つかりませんでした。
        </div>
      )}
      {compareError && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {compareError}
        </div>
      )}
    </>
  );
}
