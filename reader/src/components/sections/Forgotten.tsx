import type { Forgotten as ForgottenType } from '../../types/issue'
import { color, font } from '../../theme/tokens'

export function Forgotten({ forgotten }: { forgotten: ForgottenType | null }) {
  if (!forgotten) return null
  return (
    <section style={{ maxWidth: 640, margin: '50px auto 0', textAlign: 'center' }}>
      <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: color.faint,
        fontWeight: 600 }}>
        You may have forgotten…
      </div>
      <p style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 24, lineHeight: 1.4,
        color: color.muted, marginTop: 12 }}>{forgotten.note}</p>
      <p style={{ fontSize: 15, color: color.faint, marginTop: 8, fontStyle: 'italic' }}>{forgotten.nudge}</p>
    </section>
  )
}
