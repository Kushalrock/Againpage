// Device-local preference key for the "notify me when an edition is ready"
// toggle. Notifications are per-device and Android-only, so this lives in
// localStorage, not on the engine.
export const NOTIFY_KEY = 'againpage.notifyOnReady'

export function notifyEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(NOTIFY_KEY) === '1'
  } catch {
    return false
  }
}

export function setNotifyEnabled(on: boolean): void {
  try {
    if (on) globalThis.localStorage?.setItem(NOTIFY_KEY, '1')
    else globalThis.localStorage?.removeItem(NOTIFY_KEY)
  } catch {
    /* storage unavailable — nothing we can do */
  }
}

/** When to fire the "edition ready" notification: the engine's tz-aware
 * next_edition_at plus a buffer (composing starts at the delivery time and
 * takes a minute or two). Returns null when there is no next edition or the
 * fire time is already in the past (the edition is already here). */
export function editionNotifyTime(
  nextEditionAtISO: string | null,
  bufferMin: number,
  nowMs: number,
): Date | null {
  if (!nextEditionAtISO) return null
  const fireMs = new Date(nextEditionAtISO).getTime() + bufferMin * 60_000
  if (Number.isNaN(fireMs) || fireMs <= nowMs) return null
  return new Date(fireMs)
}
