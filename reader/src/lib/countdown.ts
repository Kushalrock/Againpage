import { useEffect, useState } from 'react'

export function formatCountdown(targetISO: string | null, nowMs: number): { label: string; due: boolean } {
  if (!targetISO) return { label: '', due: false }
  const ms = new Date(targetISO).getTime() - nowMs
  if (ms <= 0) return { label: 'being composed…', due: true }
  const mins = Math.floor(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return { label: h > 0 ? `in ${h}h ${m}m` : `in ${m}m`, due: false }
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
