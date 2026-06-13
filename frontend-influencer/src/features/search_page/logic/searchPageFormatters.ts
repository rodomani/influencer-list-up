export const formatRangeValue = (value: number) =>
  new Intl.NumberFormat("ja-JP").format(value);

export const normalizeKeywordOptions = (rows: Array<{ keywords?: string | null }>) => {
  const flattened = rows.flatMap((row) => {
    const value = row.keywords;
    if (!value) return [];
    return value
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  });

  return Array.from(new Set(flattened)).sort((a, b) => a.localeCompare(b));
};
