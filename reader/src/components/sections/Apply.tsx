import { color, font } from '../../theme/tokens'

export function Apply({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <section style={{ maxWidth: 620, margin: '60px auto 0' }}>
      <div style={{ border: `1px solid ${color.dark}`, background: color.card, padding: '28px 32px 32px' }}>
        <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: color.accent,
          fontWeight: 600, textAlign: 'center' }}>
          Things to apply
        </div>
        <div style={{ margin: '18px auto 0', width: 34, borderTop: `1px solid ${color.gold}` }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 20 }}>
          {items.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: font.display, color: color.accent, fontSize: 18, lineHeight: 1.4,
                flex: '0 0 auto' }}>§</span>
              <p style={{ fontSize: 18.5, lineHeight: 1.56, color: color.inkBody }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
