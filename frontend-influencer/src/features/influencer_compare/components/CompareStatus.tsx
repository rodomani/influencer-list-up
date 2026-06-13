type CompareStatusProps = {
  loading: boolean;
  error: string | null;
};

export function CompareStatus({ loading, error }: CompareStatusProps) {
  return (
    <>
      {loading && (
        <div className="border border-slate-200 bg-white p-6 text-sm text-slate-500">
          比較データを読み込み中...
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          エラー: {error}
        </div>
      )}
    </>
  );
}
