import { color, font } from '../../theme/tokens'

export function EditionHead({ dek, title, standfirst, sources, onOpenNote }: {
  dek: string; title: string; standfirst: string; sources: string[]; onOpenNote?: (title: string) => void
}) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 740, margin: '46px auto 0' }}>
      <div style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase',
        color: color.accent, fontWeight: 600 }}>
        {dek}
      </div>
      <h2 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(44px,7vw,76px)',
        lineHeight: 1.0, letterSpacing: '-.015em', margin: '16px 0 0', color: color.inkStrong }}>
        {title}
      </h2>
      <p style={{ fontFamily: font.body, fontStyle: 'italic', fontWeight: 400,
        fontSize: 'clamp(19px,2.4vw,24px)', lineHeight: 1.5, color: color.muted,
        margin: '22px auto 0', maxWidth: 640 }}>
        {standfirst}
      </p>
      <div style={{ margin: '24px auto 0', width: 46, borderTop: `1px solid ${color.borderStrong}` }} />
      <div style={{ marginTop: 18, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
        color: color.faint, fontWeight: 600 }}>
        Composed from your notes ·{' '}
        {sources.map((s, i) => (
          <span key={s}>
            {i > 0 && ' · '}
            <button type="button" onClick={() => onOpenNote?.(s)} title={`Read "${s}" in full`}
              style={{ background: 'none', border: 'none', padding: 0, cursor: onOpenNote ? 'pointer' : 'default',
                font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit',
                color: onOpenNote ? color.accent : color.faint }}>
              {s}
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
