import type { StandaloneSummary } from '../../types/issue'
import { color, font } from '../../theme/tokens'

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']

export function StandaloneSummaries({ items, onOpenNote }: {
  items: StandaloneSummary[]; onOpenNote?: (title: string) => void
}) {
  if (!items.length) return null
  return (
    <section style={{ maxWidth: 880, margin: '60px auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <span style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase',
          color: color.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>In brief — the featured notes</span>
        <span style={{ flex: 1, borderTop: `1px solid ${color.borderStrong}` }} />
      </div>
      <p style={{ fontSize: 15, color: color.faint, fontStyle: 'italic', marginBottom: 22 }}>
        A one-line refresher for each note woven into today's lead. Click any note to read it in full.
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
              <button type="button" onClick={() => onOpenNote?.(s.note)} title={`Read "${s.note}" in full`}
                style={{ display: 'block', textAlign: 'left', background: 'none', border: 'none', padding: 0,
                  cursor: onOpenNote ? 'pointer' : 'default', fontFamily: font.display, fontWeight: 600,
                  fontSize: 27, lineHeight: 1.08, color: color.inkStrong, margin: '12px 0 8px', letterSpacing: '-.01em' }}>
                <h4 style={{ margin: 0, font: 'inherit', color: 'inherit' }}>{s.note}</h4>
              </button>
              <div style={{ fontSize: 12, letterSpacing: '.04em', color: color.faint,
                fontStyle: 'italic' }}>{s.source}</div>
              {onOpenNote && (
                <button type="button" onClick={() => onOpenNote(s.note)}
                  style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 13, color: color.accent, fontStyle: 'italic' }}>
                  Read in full →
                </button>
              )}
            </div>
            <p style={{ flex: 1, minWidth: 280, fontSize: 17.5, lineHeight: 1.72,
              color: '#332F26' }}>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
