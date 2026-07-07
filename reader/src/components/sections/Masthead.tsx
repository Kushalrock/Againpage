import { color, font } from '../../theme/tokens'

export function Masthead({ issueNo, dateLabel }: { issueNo: number; dateLabel: string }) {
  return (
    <header style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.fainter,
        fontWeight: 600 }}>
        <span>Vol. II — No. {issueNo}</span>
        <span>{dateLabel}</span>
      </div>
      <h1 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(46px,7vw,82px)',
        lineHeight: .94, letterSpacing: '-.01em', margin: '18px 0 0', color: color.inkStrong }}>
        Againpage
      </h1>
      <div style={{ margin: '14px 0 0', fontSize: 11, letterSpacing: '.32em', textTransform: 'uppercase',
        color: color.fainter, fontWeight: 600 }}>
        A daily edition composed from your own notes
      </div>
      <div style={{ marginTop: 20, borderTop: `2px solid ${color.inkStrong}`,
        borderBottom: `1px solid ${color.inkStrong}`, height: 5 }} />
    </header>
  )
}
