import { formatCountdown } from './countdown'
const T = '2026-06-30T07:00:00'
test('future shows in Xh Ym, never negative', () => {
  const now = new Date('2026-06-30T02:15:00').getTime()
  expect(formatCountdown(T, now)).toEqual({ label: 'in 4h 45m', due: false })
})
test('under an hour shows minutes only', () => {
  const now = new Date('2026-06-30T06:30:00').getTime()
  expect(formatCountdown(T, now)).toEqual({ label: 'in 30m', due: false })
})
test('past → being composed, never negative', () => {
  const now = new Date('2026-06-30T07:00:01').getTime()
  expect(formatCountdown(T, now)).toEqual({ label: 'being composed…', due: true })
})
test('null → empty', () => {
  expect(formatCountdown(null, Date.now())).toEqual({ label: '', due: false })
})

import { nextEditionAt } from './countdown'
test('multi-day gap shows days + hours', () => {
  const now = new Date('2026-06-30T05:00:00').getTime()
  const target = '2026-07-02T07:00:00'                    // ~2d 2h away
  expect(formatCountdown(target, now)).toEqual({ label: 'in 2d 2h', due: false })
})
test('nextEditionAt: first edition lands today at delivery time', () => {
  const now = new Date('2026-06-30T05:00:00')
  const iso = nextEditionAt('07:00', 3, null, now)
  expect(new Date(iso).getHours()).toBe(7)
  expect(new Date(iso).getDate()).toBe(30)                // today, ignores the gap for the first one
})
test('nextEditionAt: subsequent = last issue + cadence_days at delivery', () => {
  const iso = nextEditionAt('08:00', 3, '2026-06-30', new Date('2026-06-30T09:00:00'))
  const d = new Date(iso)
  expect(d.getDate()).toBe(3)                             // 30 Jun + 3 days = 3 Jul
  expect(d.getMonth()).toBe(6)                            // July (0-indexed)
  expect(d.getHours()).toBe(8)
})
