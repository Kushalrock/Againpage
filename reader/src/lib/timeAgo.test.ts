import { timeAgo } from './timeAgo'
const at = (s: string) => new Date(s).getTime()
test('recent → just now', () => {
  expect(timeAgo('2026-07-12T10:00:00Z', at('2026-07-12T10:00:20Z'))).toBe('just now')
})
test('minutes and hours', () => {
  expect(timeAgo('2026-07-12T10:00:00Z', at('2026-07-12T10:12:00Z'))).toBe('12m ago')
  expect(timeAgo('2026-07-12T10:00:00Z', at('2026-07-12T13:00:00Z'))).toBe('3h ago')
})
