import { afterEach, expect, test } from 'vitest'
import { editionNotifyTime, notifyEnabled, setNotifyEnabled, NOTIFY_KEY } from './notifySchedule'

afterEach(() => localStorage.clear())

const iso = '2026-07-12T14:20:00+05:30'          // 08:50:00Z
const at = (s: string) => new Date(s).getTime()

test('editionNotifyTime adds the buffer to next_edition_at', () => {
  const t = editionNotifyTime(iso, 5, at('2026-07-12T08:00:00Z'))
  expect(t?.toISOString()).toBe('2026-07-12T08:55:00.000Z')   // 08:50Z + 5m
})

test('editionNotifyTime returns null when there is no next edition', () => {
  expect(editionNotifyTime(null, 5, at('2026-07-12T08:00:00Z'))).toBeNull()
})

test('editionNotifyTime returns null when the fire time is already past', () => {
  // now is after next_edition_at + 5m (08:55Z)
  expect(editionNotifyTime(iso, 5, at('2026-07-12T09:00:00Z'))).toBeNull()
})

test('notifyEnabled round-trips via localStorage and defaults false', () => {
  expect(notifyEnabled()).toBe(false)
  setNotifyEnabled(true)
  expect(localStorage.getItem(NOTIFY_KEY)).toBe('1')
  expect(notifyEnabled()).toBe(true)
  setNotifyEnabled(false)
  expect(notifyEnabled()).toBe(false)
  expect(localStorage.getItem(NOTIFY_KEY)).toBeNull()
})
