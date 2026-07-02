import { useState } from 'react'
import { useTodayIssue } from '../api/queries'
import { Issue } from '../components/Issue'
import { lengthLabel } from '../lib/readingLength'
import { color } from '../theme/tokens'

export function Today() {
  const { data, isLoading } = useTodayIssue()
  const [minutes, setMinutes] = useState<number | null>(null)
  if (isLoading || !data) return <div style={{ padding: 48 }}>Composing…</div>
  const m = minutes ?? data.reading_min
  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F4EEDFE6',
        backdropFilter: 'saturate(1.1)', borderBottom: `1px solid ${color.border}` }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '14px clamp(20px,4vw,40px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase',
            color: color.faint, fontWeight: 600 }}>Today's edition</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input aria-label="reading length" type="range" min={3} max={15} step={1} value={m}
              onChange={(e) => setMinutes(+e.target.value)} />
            <span style={{ fontSize: 13, color: color.muted, whiteSpace: 'nowrap' }}>
              {m} min read · <span style={{ fontStyle: 'italic', color: color.accent }}>{lengthLabel(m)}</span>
            </span>
          </div>
        </div>
      </div>
      <Issue issue={data} minutes={m} />
    </div>
  )
}
