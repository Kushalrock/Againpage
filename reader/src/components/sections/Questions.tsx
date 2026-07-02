import type { Question } from '../../types/issue'
import { color, font } from '../../theme/tokens'

export function Questions({ items }: { items: Question[] }) {
  if (!items.length) return null
  return (
    <section style={{ maxWidth: 640, margin: '62px auto 0' }}>
      <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase',
        color: color.accent, fontWeight: 600, marginBottom: 28 }}>
        Questions to sit with
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {items.map((q, i) => (
          <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'baseline', justifyContent: 'center' }}>
            <span style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 22, color: color.gold,
              flex: '0 0 auto' }}>{String(i + 1).padStart(2, '0')}</span>
            <p style={{ fontFamily: font.display, fontStyle: 'italic', fontWeight: 500,
              fontSize: 'clamp(21px,2.6vw,27px)', lineHeight: 1.36, color: color.inkBody,
              textAlign: 'center', maxWidth: 540 }}>{q.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
