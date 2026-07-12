export type CompatResult = 'ok' | 'engine-too-old' | 'reader-too-old'

// Parse "0.1.4", "0.1.4-alpha", "v0.1.4+build" → [0,1,4]; null if unparseable.
function toParts(v: string | null | undefined): number[] | null {
  if (!v) return null
  const core = String(v).trim().replace(/^v/, '').split('-')[0].split('+')[0]
  const parts = core.split('.').map((x) => Number(x))
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return null
  return parts
}

function cmp(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

export function checkCompat(p: {
  engineVersion?: string | null; minReader: string; readerVersion: string; minEngine: string
}): CompatResult {
  const eng = toParts(p.engineVersion)
  if (!eng || cmp(eng, toParts(p.minEngine)!) < 0) return 'engine-too-old'
  if (cmp(toParts(p.readerVersion)!, toParts(p.minReader)!) < 0) return 'reader-too-old'
  return 'ok'
}
