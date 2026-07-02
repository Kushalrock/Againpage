import type { StandaloneSummary } from '../../types/issue'
import { color, font } from '../../theme/tokens'

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']

export function StandaloneSummaries({ items }: { items: StandaloneSummary[] }) {
  if (!items.length) return null
  return (
    <section style={{ maxWidth: 880, margin: '60px auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <span style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase',
          color: color.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>In brief — the featured notes</span>
        <span style={{ flex: 1, borderTop: `1px solid ${color.borderStrong}` }} />
      </div>
      <p style={{ fontSize: 15, color: color.faint, fontStyle: 'italic', marginBottom: 22 }}>
        A one-line refresher for each note woven into today's lead.
      </p>
      <div style={{ borderTop: `2px solid ${color.dark}` }}>
        {items.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 40px',
            padding: '30px 0 32px', borderBottom: `1px solid ${color.border}` }}>
            <div style={{ flex: '0 0 220px', minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 17,
                  color: color.gold }}>{ROMAN[i] ?? i + 1}</span>
                <span style={{ fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase',
                  color: color.faint, fontWeight: 600 }}>Featured note</span>
              </div>
              <h4 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 27, lineHeight: 1.08,
                color: color.inkStrong, margin: '12px 0 8px', letterSpacing: '-.01em' }}>{s.note}</h4>
              <div style={{ fontSize: 12, letterSpacing: '.04em', color: color.faint,
                fontStyle: 'italic' }}>{s.source}</div>
            </div>
            <p style={{ flex: 1, minWidth: 280, fontSize: 17.5, lineHeight: 1.72,
              color: '#332F26' }}>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
