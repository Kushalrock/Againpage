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
