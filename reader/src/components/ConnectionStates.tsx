import { color, font } from '../theme/tokens'

const centered = {
  minHeight: 'var(--app-h)', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', padding: '48px 24px',
  background: color.paper, textAlign: 'center',
} as const

export function Connecting() {
  return (
    <div style={centered}>
      <div style={{ fontFamily: font.display, fontSize: 26, color: color.inkStrong, letterSpacing: '-.01em' }}>
        Reaching the newsroom…
      </div>
      <div style={{ width: 46, height: 1, background: color.borderStrong, marginTop: 18 }} />
    </div>
  )
}

export type Secondary = { label: string; onClick: () => void }

export function Unreachable({ url, onRetry, secondary }: { url: string; onRetry: () => void; secondary: Secondary }) {
  return (
    <div style={centered}>
      <h1 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 30, color: color.inkStrong, letterSpacing: '-.01em', margin: 0 }}>
        The newsroom isn't answering.
      </h1>
      <p style={{ fontSize: 15, color: color.muted, marginTop: 14 }}>
        Couldn't reach the press at<br />
        <span style={{ fontFamily: font.mono, fontSize: 14, color: color.inkStrong, wordBreak: 'break-all' }}>{url}</span>
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" onClick={onRetry}
          style={{ background: color.dark, border: `1px solid ${color.dark}`, borderRadius: 5,
            padding: '10px 22px', fontSize: 14, color: color.paper, cursor: 'pointer', fontFamily: font.body }}>
          Try again
        </button>
        <button type="button" onClick={secondary.onClick}
          style={{ background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
            padding: '10px 22px', fontSize: 14, color: color.muted, cursor: 'pointer', fontFamily: font.body }}>
          {secondary.label}
        </button>
      </div>
    </div>
  )
}
