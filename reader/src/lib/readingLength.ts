export function cfg(minutes: number) {
  const t = Math.max(0, Math.min(1, (minutes - 3) / 12));
  return {
    leadBlocks: Math.round(4 + t * 8),        // 4..12 (incl. opening)
    connections: Math.max(2, Math.round(2 + t * 4)), // 2..6
    questions: Math.max(1, Math.round(1 + t * 2)),   // 1..3
    summaries: minutes >= 5,
    apply: minutes >= 6,
    applyN: minutes >= 12 ? 3 : 2,
    wildcard: minutes >= 11,
    forgotten: minutes >= 10,
  };
}
export function lengthLabel(m: number): string {
  if (m <= 4) return "a brief";
  if (m <= 7) return "a short read";
  if (m <= 11) return "the standard edition";
  return "the full edition";
}
export function wordTarget(m: number): number { return Math.round(220 * m); } // ~220 wpm
