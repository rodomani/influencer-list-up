import { RANGE_MAX, RANGE_MIN } from "./searchPageConstants";

export const updateRangeValue = (
  nextRaw: number,
  index: 0 | 1,
  current: number[]
) => {
  if (Number.isNaN(nextRaw)) return current;

  const clamped = Math.min(Math.max(nextRaw, RANGE_MIN), RANGE_MAX);
  const updated = [...current] as [number, number];
  updated[index] = clamped;

  if (updated[0] > updated[1]) {
    if (index === 0) {
      updated[1] = clamped;
    } else {
      updated[0] = clamped;
    }
  }

  return updated;
};
