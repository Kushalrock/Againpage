import { color } from '../../theme/tokens'

export function Colophon({ issueNo }: { issueNo: number }) {
  return (
    <footer style={{ maxWidth: 780, margin: '60px auto 0', borderTop: `1px solid ${color.dark}`,
      paddingTop: 16, textAlign: 'center', fontSize: 10.5, letterSpacing: '.2em',
      textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>
      Againpage · Vol. II · No. {issueNo} · End of edition
    </footer>
  )
}
