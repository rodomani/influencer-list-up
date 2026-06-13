export const topEntries = (value: Record<string, number> | null | undefined, limit = 5) =>
  Object.entries(value ?? {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, limit);

export const TOPIC_CHART_COLORS = [
  "#D4AF37",
  "#046307",
  "#F6F0DF",
  "#8B5E1E",
  "#0E7490",
  "#7F1D1D",
  "#5B7C2A",
  "#A16207",
];

export const topicChartEntries = (
  value: Record<string, number> | null | undefined,
  limit = 5,
): Array<[string, number]> => {
  const entries = topEntries(value, limit);
  const total = Object.values(value ?? {}).reduce((sum, current) => sum + Number(current || 0), 0);
  const shown = entries.reduce((sum, [, current]) => sum + Number(current || 0), 0);
  const remainder = Math.max(total - shown, 0);
  return remainder > 0.0001 ? [...entries, ["その他", remainder]] : entries;
};

export const buildPieGradient = (entries: Array<[string, number]>) => {
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (total <= 0) return "";

  let current = 0;
  return `conic-gradient(${entries
    .map(([, value], index) => {
      const start = current;
      current += (Number(value || 0) / total) * 360;
      return `${TOPIC_CHART_COLORS[index % TOPIC_CHART_COLORS.length]} ${start}deg ${current}deg`;
    })
    .join(", ")})`;
};
