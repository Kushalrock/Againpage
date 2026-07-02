import type { Connection } from '../../types/issue'
import { color } from '../../theme/tokens'

export function Connections({ items }: { items: Connection[] }) {
  if (!items.length) return null
  return (
    <section style={{ maxWidth: 780, margin: '60px auto 0' }}>
      <SectionRule label="Connections you might've missed" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {items.map((c, i) => {
          const discovery = c.flavor === 'discovery'
          return (
            <div key={i} style={{ display: 'flex', gap: 18 }}>
              <div style={{ flex: '0 0 18px', paddingTop: 6 }}>
                <span style={{ display: 'block', width: 10, height: 10, borderRadius: '50%',
                  background: discovery ? color.accent : 'transparent',
                  border: discovery ? 'none' : `1.5px solid ${color.gold}` }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase',
                  fontWeight: 600, color: discovery ? color.accent : color.goldDim, marginBottom: 6 }}>
                  {discovery ? 'Discovery — you never linked these' : 'Reminder — you once linked these'}
                </div>
                <div style={{ fontSize: 20, lineHeight: 1.5, color: color.inkBody }}>
                  <em>{c.a}</em> <span style={{ color: color.faint }}>×</span> <em>{c.b}</em>
                </div>
                <div style={{ fontSize: 13, color: color.goldDim, fontStyle: 'italic', marginTop: 5 }}>
                  Shared thread — {c.overlap}
                </div>
                <p style={{ fontSize: 17, lineHeight: 1.66, color: color.muted, marginTop: 8 }}>{c.text}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SectionRule({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 26 }}>
      <span style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase',
        color: color.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ flex: 1, borderTop: `1px solid ${color.borderStrong}` }} />
    </div>
  )
}
