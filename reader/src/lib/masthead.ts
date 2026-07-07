// Masthead numbering. There is no server-side "volume" concept — it's a
// periodical convention derived from the edition number: editions roll into a
// new volume every ISSUES_PER_VOLUME. Tune this one constant to change the
// cadence (24 keeps the current display: No. 47 → Vol. II).
export const ISSUES_PER_VOLUME = 24

export function volumeFor(issueNo: number): number {
  if (issueNo < 1) return 0
  return Math.floor((issueNo - 1) / ISSUES_PER_VOLUME) + 1
}

const _ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

export function romanize(n: number): string {
  if (n < 1) return ''
  let out = ''
  for (const [v, sym] of _ROMAN) {
    while (n >= v) { out += sym; n -= v }
  }
  return out
}

/** "Vol. II" for the edition, derived from its number. */
export function volumeLabel(issueNo: number): string {
  return `Vol. ${romanize(volumeFor(issueNo))}`
}

const _ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen']
const _TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/**
 * Spell out a small count for prose, capitalised (e.g. 47 → "Forty-seven").
 * Editorial style: words below 100, numerals for 100+. Used for the archive's
 * "N mornings, and counting." line so the count is real, not hardcoded.
 */
export function spellOutCount(n: number): string {
  if (n < 0 || n >= 100 || !Number.isInteger(n)) return String(n)
  const w = n < 20 ? _ONES[n] : _TENS[Math.floor(n / 10)] + (n % 10 ? `-${_ONES[n % 10]}` : '')
  return w.charAt(0).toUpperCase() + w.slice(1)
}
