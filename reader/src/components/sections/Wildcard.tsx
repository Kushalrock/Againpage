import type { Wildcard as WildcardType } from '../../types/issue'
import { color, font } from '../../theme/tokens'

export function Wildcard({ wildcard }: { wildcard: WildcardType | null }) {
  if (!wildcard) return null
  return (
    <section style={{ maxWidth: 780, margin: '62px auto 0' }}>
      <div style={{ background: color.dark, color: color.onDark, padding: '36px clamp(26px,5vw,48px) 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <span style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: color.gold,
            fontWeight: 600, whiteSpace: 'nowrap' }}>The wildcard</span>
          <span style={{ flex: 1, borderTop: `1px solid ${color.darkBorder}` }} />
          <span style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase',
            color: color.fainter }}>The back page</span>
        </div>
        <p style={{ fontFamily: font.body, fontSize: 20, lineHeight: 1.66, color: '#E7DECC' }}>
          {wildcard.bridge}
        </p>
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${color.darkBorder}`,
          display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <span style={{ fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase', color: color.gold,
            fontWeight: 600, flex: '0 0 auto' }}>Trivia</span>
          <p style={{ fontFamily: font.body, fontStyle: 'italic', fontSize: 17, lineHeight: 1.55,
            color: color.onDark }}>{wildcard.trivia}</p>
        </div>
      </div>
    </section>
  )
}
