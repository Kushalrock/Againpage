import { useEffect, useState } from 'react'

export function formatCountdown(targetISO: string | null, nowMs: number): { label: string; due: boolean } {
  if (!targetISO) return { label: '', due: false }
  const ms = new Date(targetISO).getTime() - nowMs
  if (ms <= 0) return { label: 'being composed…', due: true }
  const mins = Math.floor(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const label = d > 0 ? `in ${d}d ${h}h` : h > 0 ? `in ${h}h ${m}m` : `in ${m}m`
  return { label, due: false }
}

/** Project the next edition datetime (ISO) from the delivery time + day-gap,
 * mirroring the engine's scheduler.next_due: the first edition lands today at
 * the delivery time; subsequent ones at last_issue_date + cadence_days. */
export function nextEditionAt(deliveryTime: string, cadenceDays: number,
                              lastIssueDate: string | null, now: Date): string {
  const [hh, mm] = deliveryTime.split(':').map((n) => parseInt(n, 10))
  const target = lastIssueDate ? new Date(lastIssueDate + 'T00:00:00') : new Date(now)
  if (lastIssueDate) target.setDate(target.getDate() + Math.max(1, cadenceDays))
  target.setHours(hh || 0, mm || 0, 0, 0)
  return target.toISOString()
}

export function useCountdown(targetISO: string | null): { label: string; due: boolean } {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!targetISO) return
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [targetISO])
  return formatCountdown(targetISO, nowMs)
}
