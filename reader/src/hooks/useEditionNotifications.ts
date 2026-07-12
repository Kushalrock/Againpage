import { useEffect } from 'react'
import { editionNotifyTime, notifyEnabled } from '../lib/notifySchedule'
import { notifySupported, scheduleEditionReady, cancelEditionReady } from '../platform/notify'

const BUFFER_MIN = 5

/** Keeps the single "edition ready" notification aligned with the engine's
 * next_edition_at. Re-runs whenever next_edition_at changes (React Query
 * refetches settings/status on window focus, which covers app foreground).
 * A no-op unless notifications are supported (Android) and enabled. */
export function useEditionNotifications(nextEditionAtISO: string | null): void {
  useEffect(() => {
    if (!notifySupported() || !notifyEnabled()) return
    const fireAt = editionNotifyTime(nextEditionAtISO, BUFFER_MIN, Date.now())
    if (fireAt) void scheduleEditionReady(fireAt)
    else void cancelEditionReady()
  }, [nextEditionAtISO])
}
