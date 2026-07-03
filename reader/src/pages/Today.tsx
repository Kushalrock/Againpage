import { useState } from 'react'
import { useStatus, useTodayIssue } from '../api/queries'
import { useCountdown } from '../lib/countdown'
import { Issue } from '../components/Issue'
import { lengthLabel } from '../lib/readingLength'
import { color, font } from '../theme/tokens'

function whenLabel(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true })
}

export function Today({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const status = useStatus()
  const cd = useCountdown(status.data?.next_edition_at ?? null)
  // While the edition is being composed, poll BOTH status and today's issue so the
  // fresh edition swaps in automatically the moment the worker finishes.
  const issue = useTodayIssue({ refetchInterval: cd.due ? 30_000 : false })
  const [minutes, setMinutes] = useState<number | null>(null)
  useStatus({ refetchInterval: cd.due ? 30_000 : false })

  if (status.isLoading) return <div style={{ padding: 48 }}>Loading…</div>
  const s = status.data!

  // State 1: not indexed
  if (!s.indexed) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(56px,10vw,120px) 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(32px,5vw,52px)', color: color.inkStrong, lineHeight: 1.08 }}>
          Your themes haven't been composed yet.</h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: color.muted, marginTop: 20 }}>
          Point AgainPage at your notes and re-index them, and it will compose the themes your daily edition is built from.</p>
        <button type="button" onClick={() => onNavigate?.('settings')}
          style={{ marginTop: 28, background: color.dark, color: color.paper, border: `1px solid ${color.dark}`,
            borderRadius: 6, padding: '14px 28px', fontSize: 16, cursor: 'pointer', fontFamily: font.body }}>
          Compose your themes</button>
      </div>
    )
  }

  // State 2: indexed, no edition yet → first-edition countdown
  if (!issue.data) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(56px,10vw,120px) 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 18, color: color.gold }}>Coming soon</div>
        <h1 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(30px,4.6vw,48px)', color: color.inkStrong, marginTop: 8, lineHeight: 1.08 }}>
          {cd.due ? 'Your first edition is being composed…' : `Your first edition arrives ${whenLabel(s.next_edition_at)}`}</h1>
        {!cd.due && s.next_edition_at &&
          <p style={{ fontSize: 20, color: color.muted, marginTop: 16, fontStyle: 'italic' }}>{cd.label}</p>}
      </div>
    )
  }

  // State 3: edition exists → issue + next-edition header badge
  const m = minutes ?? issue.data.reading_min
  const dateLabel = new Date(issue.data.issue_date + 'T00:00:00').toLocaleDateString('en-GB',
    { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F4EEDFE6', backdropFilter: 'saturate(1.1)', borderBottom: `1px solid ${color.border}` }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '14px clamp(20px,4vw,40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>
            Today's edition · {dateLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {s.next_edition_at && <span style={{ fontSize: 12, letterSpacing: '.06em', color: color.faint, whiteSpace: 'nowrap' }}>
              Next edition · <span style={{ color: color.accent, fontStyle: 'italic' }}>{cd.due ? 'being composed…' : cd.label}</span></span>}
            <input aria-label="reading length" type="range" min={3} max={15} step={1} value={m}
              onChange={(e) => setMinutes(+e.target.value)} />
            <span style={{ fontSize: 13, color: color.muted, whiteSpace: 'nowrap' }}>
              {m} min · <span style={{ fontStyle: 'italic', color: color.accent }}>{lengthLabel(m)}</span></span>
          </div>
        </div>
      </div>
      <Issue issue={issue.data} minutes={m} />
    </div>
  )
}
