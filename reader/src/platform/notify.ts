import { isAndroid } from './mobile'

// One fixed id so a reschedule replaces the previous pending notification
// instead of stacking duplicates.
const NOTIFY_ID = 4201

/** Notifications are Android-only in this app. */
export function notifySupported(): boolean {
  return isAndroid()
}

/** Ask for (or confirm) the Android 13+ POST_NOTIFICATIONS permission.
 * Returns whether it is granted. No-op → false off Android. */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false
  const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
  if (await isPermissionGranted()) return true
  return (await requestPermission()) === 'granted'
}

/** Schedule (replacing any prior) the single "edition ready" notification. */
export async function scheduleEditionReady(fireAt: Date): Promise<void> {
  if (!notifySupported()) return
  const { sendNotification, cancel, Schedule } = await import('@tauri-apps/plugin-notification')
  await cancel([NOTIFY_ID])
  sendNotification({
    id: NOTIFY_ID,
    title: 'Your edition is ready',
    body: "Today's edition of Againpage awaits.",
    schedule: Schedule.at(fireAt, false, true), // one-shot; allowWhileIdle for Doze
  })
}

/** Cancel the pending "edition ready" notification, if any. */
export async function cancelEditionReady(): Promise<void> {
  if (!notifySupported()) return
  const { cancel } = await import('@tauri-apps/plugin-notification')
  await cancel([NOTIFY_ID])
}
